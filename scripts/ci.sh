#!/usr/bin/env bash
# The CI steps in one place, so they run the same on any host: GitHub
# Actions (.github/workflows/node.js.yml), Forgejo Actions
# (.forgejo/workflows/ci.yml), or a laptop.
#
#   bash scripts/ci.sh            # install, audit, lint, test, build
#   bash scripts/ci.sh test       # one step
#   bash scripts/ci.sh lint test  # several, in order
#
# Requires Node 24 (.node-version) and Yarn 1.22. Cloudflare Pages
# runs its own install plus `yarn build:ci` (docs/CLOUDFLARE_PAGES.md), the
# same as the build step.
set -euo pipefail

cd "$(dirname "$0")/.."

step_install() {
  yarn install --frozen-lockfile --prefer-offline --network-timeout 100000
}

# Advisory only: a vulnerable dependency is reported, not fatal.
step_audit() {
  yarn audit --groups dependencies || echo "⚠️ Security vulnerabilities found, review required"
}

step_lint() {
  yarn lint
}

step_test() {
  yarn test --ci --passWithNoTests --json --outputFile=test-report.json
}

step_build() {
  yarn build:ci
}

if [ "$#" -eq 0 ]; then
  set -- install audit lint test build
fi

for step in "$@"; do
  case "$step" in
    install | audit | lint | test | build)
      echo "==> $step"
      "step_$step"
      ;;
    *)
      echo "unknown step: $step (expected install, audit, lint, test or build)" >&2
      exit 2
      ;;
  esac
done
