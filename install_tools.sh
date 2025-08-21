#!/bin/bash

# First, run the standard npm install
npm install

# Now, install our CLI tools
echo "Installing D2 and Mermaid CLI..."

# Install Mermaid CLI globally for the build environment
npm install -g @mermaid-js/mermaid-cli

# Install D2 CLI
curl -fsSL https://d2lang.com/install.sh | sh -s --

echo "Tools installation complete."