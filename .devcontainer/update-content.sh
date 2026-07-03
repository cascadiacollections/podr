#!/usr/bin/env bash
set -e

# Ensure cache directories exist and are writable by the devcontainer user.
# Prebuilds can mount these volumes as root-owned, which breaks yarn install.
if command -v sudo >/dev/null 2>&1; then
  sudo mkdir -p /home/node/.cache/yarn /home/node/.npm
  sudo chown -R "$(id -u)":"$(id -g)" /home/node/.cache /home/node/.npm
else
  mkdir -p /home/node/.cache/yarn /home/node/.npm
fi

# Install dependencies
yarn install --prefer-offline
