#!/usr/bin/env bash
set -e

# Idempotently add workspace to global git safe.directory
git config --global --get-all safe.directory | grep -qxF "${containerWorkspaceFolder:-.}" \
  || git config --global --add safe.directory "${containerWorkspaceFolder:-.}"
