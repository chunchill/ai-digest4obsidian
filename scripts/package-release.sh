#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VERSION="${1:-$(node -p "require('./package.json').version")}"
PACKAGE_NAME="follow-builders-sync-${VERSION}"
DIST_DIR="$ROOT_DIR/dist"
PACKAGE_DIR="$DIST_DIR/$PACKAGE_NAME"
ZIP_PATH="$DIST_DIR/$PACKAGE_NAME.zip"

cd "$ROOT_DIR"
npm run build

rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR/docs"

cp "$ROOT_DIR/manifest.json" "$PACKAGE_DIR/manifest.json"
cp "$ROOT_DIR/main.js" "$PACKAGE_DIR/main.js"
cp "$ROOT_DIR/README.md" "$PACKAGE_DIR/README.md"
cp "$ROOT_DIR/docs/INSTALL.en.md" "$PACKAGE_DIR/docs/INSTALL.en.md"
cp "$ROOT_DIR/docs/INSTALL.zh-CN.md" "$PACKAGE_DIR/docs/INSTALL.zh-CN.md"
cp "$ROOT_DIR/scripts/install-to-vault.sh" "$PACKAGE_DIR/install-to-vault.sh"
chmod +x "$PACKAGE_DIR/install-to-vault.sh"

if [ -f "$ROOT_DIR/styles.css" ]; then
  cp "$ROOT_DIR/styles.css" "$PACKAGE_DIR/styles.css"
fi

rm -f "$ZIP_PATH"
(
  cd "$PACKAGE_DIR"
  zip -qr "$ZIP_PATH" .
)

rm -rf "$PACKAGE_DIR"

printf 'Release package created: %s\n' "$ZIP_PATH"
