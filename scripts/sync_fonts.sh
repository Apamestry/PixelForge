#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHARED_FONTS="$ROOT_DIR/shared/fonts"
FONT_SERVICE_FONTS="$ROOT_DIR/services/font-service/fonts"
RENDER_WORKER_FONTS="$ROOT_DIR/services/render-worker/fonts"

mkdir -p "$FONT_SERVICE_FONTS" "$RENDER_WORKER_FONTS"

echo "Syncing fonts from $SHARED_FONTS to $FONT_SERVICE_FONTS and $RENDER_WORKER_FONTS..."
cp -R "$SHARED_FONTS"/*.ttf "$FONT_SERVICE_FONTS/"
cp -R "$SHARED_FONTS"/*.ttf "$RENDER_WORKER_FONTS/"

echo "Font sync complete!"
ls -1 "$FONT_SERVICE_FONTS"
