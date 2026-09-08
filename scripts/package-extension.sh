#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
VERSION=$(grep '"version"' "$DIR/manifest.json" | head -1 | awk -F'"' '{print $4}')
ZIP_NAME="tabflow-v${VERSION}.zip"
TARGET="$DIR/$ZIP_NAME"

echo "📦 Packaging TabFlow Chrome Extension v${VERSION} from: $DIR"

rm -f "$TARGET" "$DIR/tabflow.zip"

(
  cd "$DIR"
  zip -r "$TARGET" \
    manifest.json \
    background.js \
    popup/ \
    scripts/tab-extractor.js \
    scripts/youtube-api.js \
    scripts/lucide.min.js \
    icons/ \
    -x "*.DS_Store" -x "*__MACOSX*"
)

cp "$TARGET" "$DIR/tabflow.zip"
echo "✅ Production package created successfully: $TARGET (and tabflow.zip)"
ls -lh "$TARGET" "$DIR/tabflow.zip"
