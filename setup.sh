#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "Нужен Node.js 20 или новее: https://nodejs.org/"
  exit 1
fi

NODE_MAJOR="$(node -p "parseInt(process.versions.node.split('.')[0], 10)")"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Нужен Node.js 20+, сейчас: $(node -v)"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm не найден (ожидается вместе с Node.js)."
  exit 1
fi

echo "Установка npm-зависимостей…"
npm install

echo "Запуск scripts/setup.mjs…"
node "$ROOT/scripts/setup.mjs" "$@"
