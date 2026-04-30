$ErrorActionPreference = "Stop"

$InstallDir = Join-Path $env:LOCALAPPDATA "PaseoTicketPrinter"
$ProjectDir = Split-Path -Parent $PSScriptRoot
$TaskName = "Paseo Ticket Printer"
$PrinterName = if ($env:PRINTER_NAME) { $env:PRINTER_NAME } else { "EPSON_TM_T20III" }
$PrinterToken = if ($env:PRINTER_TOKEN) { $env:PRINTER_TOKEN } else { "" }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js no esta instalado. Instala Node.js LTS y vuelve a ejecutar este instalador." -ForegroundColor Red
  exit 1
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Copy-Item -Path (Join-Path $ProjectDir "printer-connector") -Destination $InstallDir -Recurse -Force
Copy-Item -Path (Join-Path $ProjectDir "package.json") -Destination $InstallDir -Force

$EnvFile = Join-Path $InstallDir ".env"
@"
PRINTER_MODE=system
PRINTER_NAME=$PrinterName
PRINTER_CONNECTOR_HOST=127.0.0.1
PRINTER_CONNECTOR_PORT=3010
PRINTER_TOKEN=$PrinterToken
"@ | Set-Content -Path $EnvFile -Encoding UTF8

$StartScript = Join-Path $InstallDir "start-printer.cmd"
@"
@echo off
cd /d "$InstallDir"
set PRINTER_MODE=system
set PRINTER_NAME=$PrinterName
set PRINTER_CONNECTOR_HOST=127.0.0.1
set PRINTER_CONNECTOR_PORT=3010
set PRINTER_TOKEN=$PrinterToken
node printer-connector/server.js
"@ | Set-Content -Path $StartScript -Encoding ASCII

$Action = New-ScheduledTaskAction -Execute $StartScript
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel LeastPrivilege
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings | Out-Null
Start-ScheduledTask -TaskName $TaskName

Write-Host "Conector instalado en $InstallDir" -ForegroundColor Green
Write-Host "Consola local: http://127.0.0.1:3010" -ForegroundColor Green
