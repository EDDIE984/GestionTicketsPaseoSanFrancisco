$ErrorActionPreference = "Stop"

$InstallDir = Join-Path $env:LOCALAPPDATA "PaseoTicketPrinter"
$ProjectDir = Split-Path -Parent $PSScriptRoot
$TaskName = "Paseo Ticket Printer"
$PrinterName = if ($env:PRINTER_NAME) {
  $env:PRINTER_NAME
} else {
  $detected = Get-Printer -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "*EPSON*" -or $_.Name -like "*TM-T*" -or $_.Name -like "*TM_T*" } |
    Select-Object -First 1
  if ($detected) { $detected.Name } else { "EPSON_TM_T20III" }
}
$PrinterToken = if ($env:PRINTER_TOKEN) { $env:PRINTER_TOKEN } else { "" }

$NodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $NodeCommand) {
  Write-Host "Node.js no esta instalado. Instala Node.js LTS y vuelve a ejecutar este instalador." -ForegroundColor Red
  exit 1
}
$NodePath = $NodeCommand.Source

Write-Host "Deteniendo consola POS anterior..." -ForegroundColor Cyan
Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -and $_.CommandLine.Contains("PaseoTicketPrinter") } |
  ForEach-Object {
    try {
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    } catch {}
  }

Write-Host "Limpiando instalacion anterior..." -ForegroundColor Cyan
Remove-Item -Path $InstallDir -Recurse -Force -ErrorAction SilentlyContinue

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Write-Host "Copiando archivos de la consola POS..." -ForegroundColor Cyan
Copy-Item -Path (Join-Path $ProjectDir "printer-connector") -Destination $InstallDir -Recurse -Force
Copy-Item -Path (Join-Path $ProjectDir "package.json") -Destination $InstallDir -Force
Get-ChildItem -Path $InstallDir -Recurse -Include *.ps1 | Unblock-File -ErrorAction SilentlyContinue

$EnvFile = Join-Path $InstallDir ".env"
@"
PRINTER_MODE=system
PRINTER_NAME=$PrinterName
PRINTER_CONNECTOR_HOST=127.0.0.1
PRINTER_CONNECTOR_PORT=3010
PRINTER_TOKEN=$PrinterToken
"@ | Set-Content -Path $EnvFile -Encoding UTF8

$Action = New-ScheduledTaskAction -Execute $NodePath -Argument "printer-connector/server.js" -WorkingDirectory $InstallDir
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Write-Host "Registrando servicio de impresion..." -ForegroundColor Cyan
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings | Out-Null
Start-ScheduledTask -TaskName $TaskName

Write-Host "Conector instalado en $InstallDir" -ForegroundColor Green
Write-Host "Consola local: http://127.0.0.1:3010" -ForegroundColor Green
