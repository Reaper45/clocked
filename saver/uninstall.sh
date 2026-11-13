#!/bin/sh
# Removes Clocked.saver from ~/Library/Screen Savers, plus any copies an install left behind.
# Pick another screen saver in System Settings first, then log out and back in afterwards.
set -eu

DEST="$HOME/Library/Screen Savers"
removed=0
for path in "$DEST/Clocked.saver" "$DEST/.Clocked.saver.new" "$DEST/.Clocked.saver.old"; do
  if [ -e "$path" ]; then
    rm -rf "$path"
    echo "Removed $path"
    removed=1
  fi
done

if [ "$removed" = 0 ]; then
  echo "Clocked isn't installed in $DEST"
else
  echo "Log out and back in so macOS unloads it"
fi
