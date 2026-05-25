#!/usr/bin/env bash
set -e

# Ensure Yarn is available (corepack fallback)
if ! command -v yarn &>/dev/null; then
  corepack enable
fi

# Install dependencies
yarn install --prefer-offline

# Install gh-copilot extension if missing
if ! gh extension list 2>/dev/null | grep -q "gh-copilot"; then
  gh extension install github/gh-copilot || true
fi

# Create ~/.local/bin/copilot shim
mkdir -p ~/.local/bin
cat > ~/.local/bin/copilot << 'EOF'
#!/usr/bin/env bash
exec gh copilot "$@"
EOF
chmod +x ~/.local/bin/copilot
