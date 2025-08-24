#!/bin/bash

# First, run the standard npm install
npm install

# Now, install our CLI tools
echo "Installing D2 and Mermaid CLI..."

# Install Mermaid CLI globally for the build environment
npm install -g @mermaid-js/mermaid-cli


echo "Tools installation complete."