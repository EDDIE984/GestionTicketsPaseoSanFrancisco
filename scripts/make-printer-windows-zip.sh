#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$ROOT_DIR/.installer-build/windows-zip"
STAGE_DIR="$BUILD_DIR/PaseoTicketPrinter"
OUTPUT_DIR="$ROOT_DIR/public/installers"
OUTPUT_FILE="$OUTPUT_DIR/paseo-ticket-printer-windows.zip"

rm -rf "$BUILD_DIR"
mkdir -p "$STAGE_DIR" "$OUTPUT_DIR"

cp -R "$ROOT_DIR/printer-connector" "$STAGE_DIR/"
rm -rf "$STAGE_DIR/printer-connector/data"
cp "$ROOT_DIR/package.json" "$STAGE_DIR/package.json"

cat > "$STAGE_DIR/Instalar.bat" <<'EOF'
@echo off
setlocal
set "SCRIPT=%~dp0printer-connector\install-windows.ps1"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force; Unblock-File -LiteralPath '%SCRIPT%' -ErrorAction SilentlyContinue; & '%SCRIPT%'"
if errorlevel 1 (
  echo.
  echo No se pudo instalar la consola POS. Revisa el error anterior.
)
pause
EOF

rm -f "$OUTPUT_FILE"
cd "$BUILD_DIR"
zip -r "$OUTPUT_FILE" PaseoTicketPrinter
echo "$OUTPUT_FILE"
