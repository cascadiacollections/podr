#!/bin/sh
#
# Install a Podr build onto a Debian or FreeBSD host.
#
# Podr builds to a static directory, so a deployment is just "unpack the
# artifact somewhere and point the web server at it". This script does that
# atomically: each release is extracted into its own directory and the symlink
# the web server serves from is swapped only once the extraction succeeded, so a
# failed or half-finished download never becomes the live site. A rollback is
# then just re-pointing the symlink at the previous release.
#
# POSIX sh on purpose: this has to run under Debian's dash and FreeBSD's sh
# without bash installed.
#
# Configuration comes from the environment, or from a config file:
#   Debian:  /etc/default/podr
#   FreeBSD: /usr/local/etc/podr.conf
#
#   PODR_ARTIFACT_URL  Required. URL of a .tar.gz or .zip holding the build
#                      (the contents of dist/). A GitHub Actions artifact, a
#                      release asset, or anything your own CI publishes.
#   PODR_ROOT          Default /srv/podr. Holds releases/ and the current symlink.
#   PODR_KEEP          Default 5. Number of old releases to retain for rollback.
#   PODR_OWNER         Optional user:group to chown the extracted release to.
#   PODR_CHECKSUM_URL  Optional URL of a file containing the artifact's SHA-256
#                      (as `sha256sum`/`sha256 -r` output, or a bare hash).
#                      Strongly recommended: without it the artifact is trusted
#                      on the strength of TLS alone.
#
# Usage:
#   podr-deploy.sh                 install the artifact at PODR_ARTIFACT_URL
#   podr-deploy.sh rollback        re-point current at the previous release
#   podr-deploy.sh list            list installed releases

set -eu

for candidate in /etc/default/podr /usr/local/etc/podr.conf; do
	if [ -r "$candidate" ]; then
		# shellcheck disable=SC1090
		. "$candidate"
	fi
done

PODR_ROOT="${PODR_ROOT:-/srv/podr}"
PODR_KEEP="${PODR_KEEP:-5}"
RELEASES_DIR="$PODR_ROOT/releases"
CURRENT_LINK="$PODR_ROOT/current"

log() {
	echo "podr-deploy: $*" >&2
}

die() {
	log "$*"
	exit 1
}

require_command() {
	command -v "$1" >/dev/null 2>&1 || die "$1 is required but not installed"
}

# Prints the SHA-256 of a file, coping with GNU coreutils and FreeBSD base.
sha256_of() {
	if command -v sha256sum >/dev/null 2>&1; then
		sha256sum "$1" | awk '{print $1}'
	elif command -v sha256 >/dev/null 2>&1; then
		sha256 -q "$1"
	else
		die "neither sha256sum nor sha256 is available; cannot verify the artifact"
	fi
}

list_releases() {
	# Releases are named with a sortable UTC timestamp, so lexical order is
	# chronological order.
	[ -d "$RELEASES_DIR" ] || return 0
	ls -1 "$RELEASES_DIR" | sort
}

cmd_list() {
	current=""
	if [ -L "$CURRENT_LINK" ]; then
		current=$(basename "$(readlink "$CURRENT_LINK")")
	fi

	list_releases | while read -r release; do
		if [ "$release" = "$current" ]; then
			echo "$release (current)"
		else
			echo "$release"
		fi
	done
}

cmd_rollback() {
	[ -L "$CURRENT_LINK" ] || die "no current release to roll back from"

	current=$(basename "$(readlink "$CURRENT_LINK")")
	# The newest release strictly older than the current one - not merely the
	# newest that is not current, which would ping-pong between two releases
	# when rolling back twice. Release names are sortable timestamps, so a
	# string comparison is a chronological one.
	previous=$(list_releases | awk -v current="$current" '$0 < current' | tail -n 1)

	[ -n "$previous" ] || die "no previous release to roll back to"

	activate "$previous"
	log "rolled back to $previous"
}

# Atomically points current at a release: ln -s to a temporary name, then rename
# over the existing symlink. A plain `ln -sfn` would unlink first, leaving a
# window in which the web server's document root does not exist.
#
# The rename needs a flag, and the two platforms spell it differently: because
# `current` is a symlink *to a directory*, a bare `mv new current` follows it and
# moves the new link inside the release instead of replacing it. GNU mv needs -T,
# FreeBSD mv needs -h. Try the BSD spelling first and fall back to the GNU one;
# whichever is wrong fails on the unknown option without touching anything.
activate() {
	release="$1"
	[ -d "$RELEASES_DIR/$release" ] || die "release $release does not exist"

	rm -f "$CURRENT_LINK.new"
	ln -s "$RELEASES_DIR/$release" "$CURRENT_LINK.new"

	if ! mv -hf "$CURRENT_LINK.new" "$CURRENT_LINK" 2>/dev/null; then
		mv -Tf "$CURRENT_LINK.new" "$CURRENT_LINK"
	fi
}

prune_releases() {
	current=$(basename "$(readlink "$CURRENT_LINK")")
	total=$(list_releases | wc -l | tr -d ' ')

	[ "$total" -gt "$PODR_KEEP" ] || return 0

	surplus=$((total - PODR_KEEP))
	list_releases | head -n "$surplus" | while read -r release; do
		[ "$release" != "$current" ] || continue
		log "pruning release $release"
		rm -rf "$RELEASES_DIR/$release"
	done
}

cmd_deploy() {
	[ -n "${PODR_ARTIFACT_URL:-}" ] || die "PODR_ARTIFACT_URL is not set"
	require_command curl
	require_command tar

	release=$(date -u +%Y%m%d%H%M%S)
	staging="$RELEASES_DIR/.staging.$release"
	workdir=$(mktemp -d "${TMPDIR:-/tmp}/podr-deploy.XXXXXX")

	# Leave nothing behind on failure: the staging directory would otherwise be
	# picked up as a release name by list_releases on the next run.
	trap 'rm -rf "$workdir" "$staging"' EXIT INT TERM

	mkdir -p "$RELEASES_DIR" "$staging"

	archive="$workdir/artifact"
	log "fetching $PODR_ARTIFACT_URL"
	curl --fail --silent --show-error --location --retry 3 --retry-delay 2 \
		--output "$archive" "$PODR_ARTIFACT_URL"

	if [ -n "${PODR_CHECKSUM_URL:-}" ]; then
		log "verifying checksum"
		expected=$(curl --fail --silent --show-error --location \
			"$PODR_CHECKSUM_URL" | awk '{print $1}' | head -n 1)
		actual=$(sha256_of "$archive")

		[ -n "$expected" ] || die "checksum file at PODR_CHECKSUM_URL was empty"
		[ "$expected" = "$actual" ] ||
			die "checksum mismatch: expected $expected, got $actual"
	else
		log "PODR_CHECKSUM_URL is unset; skipping artifact verification"
	fi

	case "$PODR_ARTIFACT_URL" in
	*.zip)
		require_command unzip
		unzip -q "$archive" -d "$staging"
		;;
	*)
		tar -xzf "$archive" -C "$staging"
		;;
	esac

	# GitHub Actions artifacts and hand-rolled tarballs disagree about whether
	# the build is at the root or nested one level down. Find index.html and
	# treat its directory as the site root.
	index=$(find "$staging" -maxdepth 3 -name index.html -print | head -n 1)
	[ -n "$index" ] || die "artifact contains no index.html"

	site_root=$(dirname "$index")
	if [ "$site_root" != "$staging" ]; then
		mv "$site_root" "$staging.root"
		rm -rf "$staging"
		mv "$staging.root" "$staging"
	fi

	if [ -n "${PODR_OWNER:-}" ]; then
		chown -R "$PODR_OWNER" "$staging"
	fi
	chmod -R a+rX "$staging"

	mv "$staging" "$RELEASES_DIR/$release"
	trap 'rm -rf "$workdir"' EXIT INT TERM

	activate "$release"
	log "deployed release $release"

	prune_releases
}

case "${1:-deploy}" in
deploy) cmd_deploy ;;
rollback) cmd_rollback ;;
list) cmd_list ;;
*) die "usage: $(basename "$0") [deploy|rollback|list]" ;;
esac
