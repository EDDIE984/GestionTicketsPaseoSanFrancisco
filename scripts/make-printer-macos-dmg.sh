#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$ROOT_DIR/.installer-build/macos"
STAGE_DIR="$BUILD_DIR/Paseo Ticket Printer"
OUTPUT_DIR="$ROOT_DIR/public/installers"
OUTPUT_FILE="$OUTPUT_DIR/paseo-ticket-printer-mac.dmg"

rm -rf "$BUILD_DIR"
mkdir -p "$STAGE_DIR" "$OUTPUT_DIR"

cp -R "$ROOT_DIR/printer-connector" "$STAGE_DIR/printer-connector"
cp "$ROOT_DIR/package.json" "$STAGE_DIR/package.json"

cat > "$STAGE_DIR/Instalar.command" <<'EOF'
#!/bin/sh
set -eu

SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="$HOME/Applications/PaseoTicketPrinter"
PLIST_PATH="$HOME/Library/LaunchAgents/com.paseosanfrancisco.ticket-printer.plist"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js no esta instalado. Instala Node.js LTS y vuelve a ejecutar este instalador."
  exit 1
fi

NODE_BIN="$(command -v node)"

launchctl unload "$PLIST_PATH" >/dev/null 2>&1 || true
rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cp -R "$SOURCE_DIR/printer-connector" "$INSTALL_DIR/"
cp "$SOURCE_DIR/package.json" "$INSTALL_DIR/package.json"

cd "$INSTALL_DIR"
NODE_BIN="$NODE_BIN" PRINTER_MODE="${PRINTER_MODE:-system}" PRINTER_NAME="${PRINTER_NAME:-EPSON_TM_T20III}" sh printer-connector/install-macos-service.sh

echo ""
echo "Conector instalado correctamente."
echo "Consola local: http://127.0.0.1:3010"
EOF

chmod +x "$STAGE_DIR/Instalar.command"

hdiutil create \
  -volname "Paseo Ticket Printer" \
  -srcfolder "$STAGE_DIR" \
  -ov \
  -format UDZO \
  "$OUTPUT_FILE"

echo "$OUTPUT_FILE"
