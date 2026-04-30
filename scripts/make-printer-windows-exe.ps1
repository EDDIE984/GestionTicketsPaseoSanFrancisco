$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$BuildDir = Join-Path $RootDir ".installer-build\windows"
$StageDir = Join-Path $BuildDir "PaseoTicketPrinter"
$OutputDir = Join-Path $RootDir "public\installers"
$ZipFile = Join-Path $BuildDir "paseo-ticket-printer-windows.zip"
$ExeFile = Join-Path $OutputDir "paseo-ticket-printer-windows.exe"
$SedFile = Join-Path $BuildDir "iexpress.sed"
$BootstrapPs1 = Join-Path $BuildDir "Instalar.ps1"
$BootstrapBat = Join-Path $BuildDir "Instalar.bat"

Remove-Item -Path $BuildDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $StageDir, $OutputDir | Out-Null

Copy-Item -Path (Join-Path $RootDir "printer-connector") -Destination (Join-Path $StageDir "printer-connector") -Recurse -Force
Copy-Item -Path (Join-Path $RootDir "package.json") -Destination $StageDir -Force

@"
@echo off
powershell.exe -ExecutionPolicy Bypass -File "%~dp0Instalar.ps1"
pause
"@ | Set-Content -Path $BootstrapBat -Encoding ASCII

Compress-Archive -Path (Join-Path $StageDir "*") -DestinationPath $ZipFile -Force

$ZipBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($ZipFile))
@"
`$ErrorActionPreference = "Stop"
`$TempDir = Join-Path `$env:TEMP ("PaseoTicketPrinter-" + [guid]::NewGuid().ToString("N"))
`$ZipPath = Join-Path `$TempDir "payload.zip"
New-Item -ItemType Directory -Force -Path `$TempDir | Out-Null
[IO.File]::WriteAllBytes(`$ZipPath, [Convert]::FromBase64String("$ZipBase64"))
Expand-Archive -Path `$ZipPath -DestinationPath `$TempDir -Force
Set-Location `$TempDir
& powershell.exe -ExecutionPolicy Bypass -File ".\printer-connector\install-windows.ps1"
"@ | Set-Content -Path $BootstrapPs1 -Encoding UTF8

@"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=1
HideExtractAnimation=0
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=
DisplayLicense=
FinishMessage=Instalacion finalizada.
TargetName=$ExeFile
FriendlyName=Paseo Ticket Printer
AppLaunched=Instalar.bat
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
SourceFiles=SourceFiles
[Strings]
FILE0="Instalar.bat"
FILE1="Instalar.ps1"
[SourceFiles]
SourceFiles0=$BuildDir
[SourceFiles0]
%FILE0%=
%FILE1%=
"@ | Set-Content -Path $SedFile -Encoding ASCII

iexpress.exe /N /Q $SedFile

Write-Host $ExeFile
