$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$venv = Join-Path $root '.venv'
$python = Join-Path $venv 'Scripts\python.exe'

if (-not (Test-Path $python)) {
    Write-Host 'Membuat virtualenv PaddleOCR...'
    python -m venv $venv
    & $python -m pip install --disable-pip-version-check -r (Join-Path $root 'requirements.txt')
}

Write-Host 'Menjalankan PaddleOCR di http://127.0.0.1:8015 ...'
& $python -m uvicorn app:app --host 127.0.0.1 --port 8015
