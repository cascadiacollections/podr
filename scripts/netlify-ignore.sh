#!/bin/bash
# Netlify build ignore script
# Exit 0 to skip build, exit 1 to proceed with build
#
# This script determines if a Netlify build should be skipped based on what files changed.
# It skips builds only when changes are limited to package publishing metadata that
# doesn't affect the website runtime.
#
# Skip builds when ONLY these change:
# - packages/*/package.json (version bumps)
# - packages/*/package-lock.json (dependency lock file)
# - packages/*/CHANGELOG.md
# - packages/*/README.md
# - .github/workflows/publish-*.yml (publish automation)
#
# Proceed with builds when:
# - Plugin runtime code changes (*.ts, *.js in packages/) - affects website build
# - Website source changes (src/, config/, etc.)
# - Netlify configuration (netlify.toml, scripts/netlify-ignore.sh)
# - Build configuration (webpack.config.js, tsconfig.json, etc.)
# - Any other repository files change

set -e

# Validate required Netlify environment variables
if [ -z "$CACHED_COMMIT_REF" ] || [ -z "$COMMIT_REF" ]; then
  echo "Error: Required Netlify environment variables not set (CACHED_COMMIT_REF, COMMIT_REF)"
  echo "Proceeding with build for safety"
  exit 1
fi

# Get the list of changed files between commits
CHANGED_FILES=$(git diff --name-only "$CACHED_COMMIT_REF" "$COMMIT_REF" 2>/dev/null || echo "")

# If no files changed (shouldn't happen, but be safe), proceed with build
if [ -z "$CHANGED_FILES" ]; then
  echo "No files changed, proceeding with build"
  exit 1
fi

echo "Files changed:"
echo "$CHANGED_FILES"
echo ""

# Check if any plugin runtime code changed (TypeScript or JavaScript in packages/)
if echo "$CHANGED_FILES" | grep -qE '^packages/.*\.(ts|js)$'; then
  echo "✓ Plugin runtime code changed - BUILD REQUIRED (affects website)"
  exit 1
fi

# Check if any files outside packages/ or publish workflows changed
if echo "$CHANGED_FILES" | grep -qvE '^(packages/|\.github/workflows/publish-)'; then
  echo "✓ Website files changed - BUILD REQUIRED"
  exit 1
fi

# At this point, only package metadata or publish workflows changed
# Check what specifically changed in packages/
PACKAGE_CHANGES=$(echo "$CHANGED_FILES" | grep '^packages/' || echo "")

if [ -n "$PACKAGE_CHANGES" ]; then
  # Check if any files other than package.json, CHANGELOG.md, or README.md changed
  if echo "$PACKAGE_CHANGES" | grep -qvE '(package\.json|CHANGELOG\.md|README\.md|package-lock\.json)$'; then
    echo "✓ Package files (non-metadata) changed - BUILD REQUIRED"
    exit 1
  fi
fi

# Only package metadata or publish workflows changed
echo "✗ Only package metadata/publish workflows changed - SKIPPING BUILD"
echo "Changed files are:"
echo "$CHANGED_FILES"
exit 0
