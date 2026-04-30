$ErrorActionPreference = "Stop"

$InstallDir = Join-Path $env:LOCALAPPDATA "PaseoTicketPrinter"
$TaskName = "Paseo Ticket Printer"

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

if (Test-Path $InstallDir) {
  Remove-Item -Path $InstallDir -Recurse -Force
}

Write-Host "Conector desinstalado." -ForegroundColor Green
