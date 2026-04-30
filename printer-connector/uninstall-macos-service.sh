#!/bin/sh
set -eu

PLIST_PATH="$HOME/Library/LaunchAgents/com.paseosanfrancisco.ticket-printer.plist"

if [ -f "$PLIST_PATH" ]; then
  launchctl unload "$PLIST_PATH" >/dev/null 2>&1 || true
  rm -f "$PLIST_PATH"
  echo "Servicio desinstalado."
else
  echo "No existe servicio instalado."
fi
