#!/bin/bash
set -euo pipefail

# Install mise for managing development tools
echo "Installing mise..."
curl -sSf https://mise.run | sh

# Add mise to PATH for this session
export PATH="$HOME/.local/bin:$PATH"

# Trust the project mise.toml
echo "Trusting mise.toml configuration..."
mise trust

# Install all tools declared in mise.toml (node)
echo "Installing tools via mise..."
mise install

# Activate mise for current shell
eval "$(mise activate bash)"

# Add mise activation to bashrc for future sessions
echo 'eval "$(~/.local/bin/mise activate bash)"' >> ~/.bashrc

# Install npm dependencies
echo "Installing npm dependencies..."
npm ci

# Install Playwright Chromium with system deps
echo "Installing Playwright Chromium..."
npx playwright install --with-deps chromium
