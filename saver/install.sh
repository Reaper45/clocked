#!/bin/sh
# Builds Clocked.saver and installs it into ~/Library/Screen Savers.
# The new copy goes next to the installed one first, so a failed copy never removes a working saver.
set -eu
cd "$(dirname "$0")/.."

sh saver/build.sh

DEST="$HOME/Library/Screen Savers"
NEW="$DEST/.Clocked.saver.new"
OLD="$DEST/.Clocked.saver.old"
mkdir -p "$DEST"
rm -rf "$NEW" "$OLD"

cp -R saver/build/Clocked.saver "$NEW"
if [ -e "$DEST/Clocked.saver" ]; then
  mv "$DEST/Clocked.saver" "$OLD"
fi
mv "$NEW" "$DEST/Clocked.saver"
rm -rf "$OLD"

echo "Installed $DEST/Clocked.saver (log out and back in if an older version was loaded)"
