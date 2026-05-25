#!/usr/bin/env bash
set -e

# Idempotently add workspace to global git safe.directory
WORKSPACE="$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)"
git config --global --get-all safe.directory | grep -qxF "$WORKSPACE" \
  || git config --global --add safe.directory "$WORKSPACE"
