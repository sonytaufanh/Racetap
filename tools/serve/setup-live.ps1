# Racetap live setup — run this elevated (Run as Administrator).
# 1. Adds the racetap.local hostnames to the hosts file (idempotent).
# 2. Restarts Apache so the new VirtualHost is loaded.

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host 'Re-launching with administrator rights...' -ForegroundColor Yellow
    Start-Process powershell '-NoProfile -ExecutionPolicy Bypass -File "C:\xampp\htdocs\Racetap\tools\serve\setup-live.ps1"' -Verb RunAs
    exit
}

$hosts = 'C:\Windows\System32\drivers\etc\hosts'
$content = Get-Content -LiteralPath $hosts -Raw

foreach ($name in @('racetap.local', 'www.racetap.local')) {
    if ($content -notmatch "(?m)^\s*127\.0\.0\.1\s+$([regex]::Escape($name))\s*$") {
        Add-Content -LiteralPath $hosts -Value "127.0.0.1 $name"
        Write-Host "hosts: added $name" -ForegroundColor Green
    } else {
        Write-Host "hosts: $name already present" -ForegroundColor DarkGray
    }
}

# Validate the config before touching the running server.
$test = & 'C:\xampp\apache\bin\httpd.exe' -t 2>&1 | Out-String
if ($test -notmatch 'Syntax OK') { throw "Apache config test failed:`n$test" }

# Apache runs detached from xampp-control.exe (no Windows service). Kill the
# httpd tree only — never xampp-control, which owns this elevated console — then
# relaunch a fresh, detached parent so the server outlives this script.
Get-Process httpd -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3

Start-Process 'C:\xampp\apache\bin\httpd.exe' -ArgumentList '-d', 'C:/xampp/apache' -WindowStyle Hidden
Start-Sleep -Seconds 4

$probe = try {
    (Invoke-WebRequest -Uri 'http://racetap.local/api/v1/health' -UseBasicParsing -TimeoutSec 10).Content
} catch {
    "unreachable: $($_.Exception.Message)"
}

Write-Host ''
Write-Host 'Health probe: ' -NoNewline
Write-Host $probe -ForegroundColor Cyan
Write-Host ''
Write-Host 'Racetap is live at http://racetap.local/' -ForegroundColor Green
