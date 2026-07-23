#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SVG="$ROOT/public/icons/icon.svg"
BG="#1e1e2e"

render_icon() {
  local size="$1"
  local out="$2"
  convert -density 384 -background "$BG" "$SVG" \
    -resize "${size}x${size}" \
    -flatten \
    -alpha off \
    "$out"
}

render_icon 180 "$ROOT/public/apple-touch-icon.png"
render_icon 192 "$ROOT/public/icons/icon-192.png"
render_icon 512 "$ROOT/public/icons/icon-512.png"

echo "Icons generated (solid background $BG):"
echo "  public/apple-touch-icon.png (180x180)"
echo "  public/icons/icon-192.png"
echo "  public/icons/icon-512.png"
