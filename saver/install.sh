#!/bin/sh
# Builds Clocked.saver and installs it into ~/Library/Screen Savers.
# The new copy goes next to the installed one first and the old one is kept as a backup until the
# swap succeeds, so a failed or interrupted install never leaves you without a working saver.
set -eu
cd "$(dirname "$0")/.."

sh saver/build.sh

DEST="$HOME/Library/Screen Savers"
INSTALLED="$DEST/Clocked.saver"
NEW="$DEST/.Clocked.saver.new"
OLD="$DEST/.Clocked.saver.old"
mkdir -p "$DEST"

# An earlier install stopped mid-swap: put its backup back before starting over
if [ ! -e "$INSTALLED" ] && [ -e "$OLD" ]; then
  mv "$OLD" "$INSTALLED"
  echo "Restored the saver left by an interrupted install"
fi
rm -rf "$NEW" "$OLD"

cp -R saver/build/Clocked.saver "$NEW"
if [ -e "$INSTALLED" ]; then
  mv "$INSTALLED" "$OLD"
fi
if ! mv "$NEW" "$INSTALLED"; then
  if [ -e "$OLD" ]; then
    mv "$OLD" "$INSTALLED"
  fi
  echo "Install failed; kept the previous saver" >&2
  exit 1
fi
rm -rf "$OLD"

echo "Installed $INSTALLED (log out and back in if an older version was loaded)"
