#!/usr/bin/env bash
set -e

# Print gh version and auth status
gh --version
gh auth status -h github.com || true
