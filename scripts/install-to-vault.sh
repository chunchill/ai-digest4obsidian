#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat >&2 <<'EOF'
Usage: install-to-vault.sh "/path/to/your/obsidian/vault"

Installs the Follow Builders Sync plugin into the vault's .obsidian/plugins/follow-builders-sync folder.
EOF
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

if [ $# -ne 1 ]; then
  usage
  exit 1
fi

VAULT_PATH="$1"
if [ ! -d "$VAULT_PATH" ]; then
  printf 'Vault directory does not exist: %s\n' "$VAULT_PATH" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/manifest.json" ] && [ -f "$SCRIPT_DIR/main.js" ]; then
  PACKAGE_ROOT="$SCRIPT_DIR"
else
  PACKAGE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
fi
PLUGIN_DIR="$VAULT_PATH/.obsidian/plugins/follow-builders-sync"

if [ ! -f "$PACKAGE_ROOT/manifest.json" ]; then
  printf 'Missing manifest.json in package root: %s\n' "$PACKAGE_ROOT" >&2
  exit 1
fi

if [ ! -f "$PACKAGE_ROOT/main.js" ]; then
  printf 'Missing main.js in package root: %s\n' "$PACKAGE_ROOT" >&2
  exit 1
fi

mkdir -p "$PLUGIN_DIR"
cp "$PACKAGE_ROOT/manifest.json" "$PLUGIN_DIR/manifest.json"
cp "$PACKAGE_ROOT/main.js" "$PLUGIN_DIR/main.js"

if [ -f "$PACKAGE_ROOT/styles.css" ]; then
  cp "$PACKAGE_ROOT/styles.css" "$PLUGIN_DIR/styles.css"
fi

printf 'Follow Builders Sync installed to %s\n' "$PLUGIN_DIR"
printf 'Open Obsidian and enable the plugin from Settings > Community plugins.\n'
