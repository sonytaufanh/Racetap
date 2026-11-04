# Racetap live server control (run elevated for start/stop/restart).
#
#   powershell -ExecutionPolicy Bypass -File tools\serve\serve.ps1 status
#   powershell -ExecutionPolicy Bypass -File tools\serve\serve.ps1 start
#   powershell -ExecutionPolicy Bypass -File tools\serve\serve.ps1 stop
#   powershell -ExecutionPolicy Bypass -File tools\serve\serve.ps1 restart
#   powershell -ExecutionPolicy Bypass -File tools\serve\serve.ps1 deploy
#
# Serves the repository root through Apache (XAMPP) on http://racetap.local/ so
# /api/v1, /results/<slug>/ and the kiosk docroots resolve like production.

param(
    [Parameter(Position = 0)]
    [ValidateSet('status', 'start', 'stop', 'restart', 'deploy', 'ocr-start', 'ocr-stop')]
    [string]$Action = 'status'
)

$ErrorActionPreference = 'Stop'

$apacheRoot = 'C:\xampp\apache'
$httpd = Join-Path $apacheRoot 'bin\httpd.exe'
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$siteUrl = 'http://racetap.local'
$hostsFile = 'C:\Windows\System32\drivers\etc\hosts'
$ocrRoot = Join-Path $repo 'ocr_service'
$ocrPython = Join-Path $ocrRoot '.venv\Scripts\python.exe'
$ocrUrl = 'http://127.0.0.1:8010'

function Test-Admin {
    ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-ApacheProcess {
    Get-Process httpd -ErrorAction SilentlyContinue
}

function Test-Listening {
    [bool](Get-NetTCPConnection -LocalPort 80 -State Listen -ErrorAction SilentlyContinue)
}

function Test-Site {
    try {
        $r = Invoke-WebRequest -Uri "$siteUrl/api/v1/health" -UseBasicParsing -TimeoutSec 10
        return [pscustomobject]@{ Ok = $true; Status = $r.StatusCode; Body = $r.Content }
    } catch {
        return [pscustomobject]@{ Ok = $false; Status = 0; Body = $_.Exception.Message }
    }
}

function Start-Racetap {
    if (-not (Test-Admin)) { throw 'Run this command in an elevated PowerShell (Administrator).' }

    $test = & $httpd -t 2>&1 | Out-String
    if ($test -notmatch 'Syntax OK') { throw "Apache config test failed:`n$test" }

    if (Test-Listening) {
        Write-Host 'Apache is already listening on port 80.' -ForegroundColor DarkGray
        return
    }

    if (-not (Get-ApacheProcess)) {
        Start-Process $httpd -ArgumentList '-d', ($apacheRoot -replace '\\', '/') -WindowStyle Hidden
    }

    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Milliseconds 500
        if (Test-Listening) { break }
    }

    if (-not (Test-Listening)) { throw 'Apache did not start listening on port 80.' }
    Write-Host 'Apache started.' -ForegroundColor Green
}

function Stop-Racetap {
    if (-not (Test-Admin)) { throw 'Run this command in an elevated PowerShell (Administrator).' }
    Get-ApacheProcess | Stop-Process -Force
    Start-Sleep -Seconds 2
    Write-Host 'Apache stopped.' -ForegroundColor Yellow
}

function Restart-Racetap {
    Stop-Racetap
    Start-Racetap
}

function Invoke-Deploy {
    Write-Host 'Building web bundles...' -ForegroundColor Cyan
    Push-Location $repo
    try {
        & npm run build
        if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
    } finally {
        Pop-Location
    }
    Write-Host 'Build OK: assets/app refreshed.' -ForegroundColor Green
}

function Test-Ocr {
    try {
        $r = Invoke-WebRequest -Uri "$ocrUrl/health" -UseBasicParsing -TimeoutSec 5
        return [pscustomobject]@{ Ok = $true; Body = $r.Content }
    } catch {
        return [pscustomobject]@{ Ok = $false; Body = $_.Exception.Message }
    }
}

function Start-RapidOcr {
    if (-not (Test-Path $ocrPython)) {
        throw "RapidOCR venv missing. Run: powershell -ExecutionPolicy Bypass -File ocr_service\start.ps1"
    }

    if ((Test-Ocr).Ok) {
        Write-Host 'RapidOCR is already running on port 8010.' -ForegroundColor DarkGray
        return
    }

    $logDir = Join-Path $env:TEMP 'racetap-ocr'
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null

    Start-Process $ocrPython `
        -ArgumentList '-m', 'uvicorn', 'app:app', '--host', '127.0.0.1', '--port', '8010' `
        -WorkingDirectory $ocrRoot -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logDir 'ocr.out.log') `
        -RedirectStandardError (Join-Path $logDir 'ocr.err.log')

    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Milliseconds 500
        if ((Test-Ocr).Ok) { break }
    }

    if ((Test-Ocr).Ok) {
        Write-Host 'RapidOCR started on http://127.0.0.1:8010.' -ForegroundColor Green
    } else {
        Write-Host "RapidOCR did not become healthy. See $logDir" -ForegroundColor Red
    }
}

function Stop-RapidOcr {
    $listening = Get-NetTCPConnection -LocalPort 8010 -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $listening) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 1
    Write-Host 'RapidOCR stopped.' -ForegroundColor Yellow
}

function Show-Status {
    $site = Test-Site
    $ocr = Test-Ocr

    Write-Host "Repository : $repo"
    Write-Host "Site URL   : $siteUrl"
    Write-Host ("Hosts entry: " + $(if ((Get-Content -LiteralPath $hostsFile -Raw) -match '(?m)^127\.0\.0\.1\s+racetap\.local\s*$') { 'present' } else { 'missing' }))
    Write-Host ("Apache     : " + $(if (Get-ApacheProcess) { 'running' } else { 'stopped' }))
    Write-Host ("Port 80    : " + $(if (Test-Listening) { 'listening' } else { 'closed' }))
    Write-Host ("Health     : " + $(if ($site.Ok) { "OK - $($site.Body)" } else { "FAIL - $($site.Body)" })) -ForegroundColor $(if ($site.Ok) { 'Green' } else { 'Red' })
    Write-Host ("RapidOCR   : " + $(if ($ocr.Ok) { "OK - $($ocr.Body)" } else { "DOWN - $($ocr.Body)" })) -ForegroundColor $(if ($ocr.Ok) { 'Green' } else { 'Red' })

    $ips = Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.IPAddress -notlike '169.*' -and $_.IPAddress -ne '127.0.0.1' } |
        Select-Object -ExpandProperty IPAddress

    foreach ($ip in $ips) {
        Write-Host "LAN URL    : http://$ip/"
    }
}

switch ($Action) {
    'status'    { Show-Status }
    'start'     { Start-Racetap; Start-RapidOcr; Show-Status }
    'stop'      { Stop-RapidOcr; Stop-Racetap; Show-Status }
    'restart'   { Restart-Racetap; Show-Status }
    'deploy'    { Invoke-Deploy; Show-Status }
    'ocr-start' { Start-RapidOcr; Show-Status }
    'ocr-stop'  { Stop-RapidOcr; Show-Status }
}
