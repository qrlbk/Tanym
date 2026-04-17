#Requires -Version 5.0
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Нужен Node.js 20 или новее: https://nodejs.org/"
    exit 1
}

$major = [int](node -p "parseInt(process.versions.node.split('.')[0], 10)")
if ($major -lt 20) {
    Write-Host "Нужен Node.js 20+, сейчас: $(node -v)"
    exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "npm не найден (ожидается вместе с Node.js)."
    exit 1
}

Write-Host "Установка npm-зависимостей…"
npm install

Write-Host "Запуск scripts/setup.mjs…"
node "$Root\scripts\setup.mjs" @args
