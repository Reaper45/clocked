#!/bin/sh
# Builds saver/build/Clocked.saver (macOS screen saver, Apple silicon + Intel).
# Install: pnpm saver:install, then pick Clocked in System Settings → Screen Saver.
set -eu
cd "$(dirname "$0")/.."

pnpm build

OUT=saver/build/Clocked.saver
TMP=saver/build/tmp
rm -rf "$OUT" "$TMP"
mkdir -p "$OUT/Contents/MacOS" "$OUT/Contents/Resources" "$TMP"

cp saver/Info.plist "$OUT/Contents/"
cp saver/thumbnail.png saver/thumbnail@2x.png "$OUT/Contents/Resources/" # Shown in System Settings
cp -R dist "$OUT/Contents/Resources/web"

for arch in arm64 x86_64; do
  swiftc saver/ClockedView.swift \
    -swift-version 5 -O \
    -module-name Clocked \
    -target "$arch-apple-macos13.0" \
    -parse-as-library \
    -Xlinker -bundle \
    -framework ScreenSaver -framework WebKit \
    -o "$TMP/Clocked-$arch"
done
lipo -create "$TMP"/Clocked-* -output "$OUT/Contents/MacOS/Clocked"
rm -rf "$TMP"

# Ad-hoc signature: enough for a saver built and installed on this Mac
codesign --force --sign - "$OUT"

echo "Built $OUT"
