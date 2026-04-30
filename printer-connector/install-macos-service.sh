#!/bin/sh
set -eu

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST_NAME="com.paseosanfrancisco.ticket-printer.plist"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_NAME"
LOG_DIR="$PROJECT_ROOT/printer-connector/data/logs"

if [ -f "$PROJECT_ROOT/.env" ]; then
  PRINTER_TOKEN_FROM_ENV="$(grep '^PRINTER_TOKEN=' "$PROJECT_ROOT/.env" 2>/dev/null | tail -n 1 | cut -d '=' -f 2- || true)"
else
  PRINTER_TOKEN_FROM_ENV=""
fi

PRINTER_MODE="${PRINTER_MODE:-system}"
PRINTER_NAME="${PRINTER_NAME:-EPSON_TM_T20III}"
PRINTER_CONNECTOR_PORT="${PRINTER_CONNECTOR_PORT:-3010}"
PRINTER_CONNECTOR_HOST="${PRINTER_CONNECTOR_HOST:-127.0.0.1}"
PRINTER_TOKEN="${PRINTER_TOKEN:-$PRINTER_TOKEN_FROM_ENV}"
NODE_BIN="${NODE_BIN:-$(command -v node || true)}"

if [ -z "$NODE_BIN" ]; then
  echo "Node.js no esta instalado o no se encontro en PATH."
  echo "Instala Node.js LTS y vuelve a ejecutar el instalador."
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents"
mkdir -p "$LOG_DIR"

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.paseosanfrancisco.ticket-printer</string>
  <key>WorkingDirectory</key>
  <string>$PROJECT_ROOT</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>printer-connector/server.js</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PRINTER_MODE</key>
    <string>$PRINTER_MODE</string>
    <key>PRINTER_NAME</key>
    <string>$PRINTER_NAME</string>
    <key>PRINTER_CONNECTOR_PORT</key>
    <string>$PRINTER_CONNECTOR_PORT</string>
    <key>PRINTER_CONNECTOR_HOST</key>
    <string>$PRINTER_CONNECTOR_HOST</string>
    <key>PRINTER_TOKEN</key>
    <string>$PRINTER_TOKEN</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$LOG_DIR/out.log</string>
  <key>StandardErrorPath</key>
  <string>$LOG_DIR/error.log</string>
</dict>
</plist>
EOF

launchctl unload "$PLIST_PATH" >/dev/null 2>&1 || true
launchctl load "$PLIST_PATH"

echo "Servicio instalado: $PLIST_PATH"
echo "Node: $NODE_BIN"
echo "Impresora configurada: $PRINTER_NAME"
echo "Conector: http://$PRINTER_CONNECTOR_HOST:$PRINTER_CONNECTOR_PORT"
echo "Logs: $LOG_DIR"
