#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
ZIP_NAME="tabflow-v1.0.0.zip"
TARGET="$DIR/$ZIP_NAME"

echo "📦 Packaging TabFlow Chrome Extension from: $DIR"

rm -f "$TARGET" "$DIR/youtube-tabs-to-playlist-v1.0.0.zip"

(
  cd "$DIR"
  zip -r "$TARGET" \
    manifest.json \
    background.js \
    popup/ \
    scripts/tab-extractor.js \
    scripts/youtube-api.js \
    scripts/lucide.min.js \
    icons/
)

echo "✅ Production package created successfully: $TARGET"
ls -lh "$TARGET"
