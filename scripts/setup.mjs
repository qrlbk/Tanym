#!/usr/bin/env node
/**
 * Подготовка окружения: .env.local из примера, проверка Rust для Tauri.
 * Запуск: node scripts/setup.mjs [--install-rust] [--skip-rust]
 */

import { copyFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function parseSemver(s) {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(String(s).trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function cmpSemver(a, b) {
  if (!a || !b) return null;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function prependCargoBinToPath() {
  const home = process.env.USERPROFILE || process.env.HOME;
  if (!home) return;
  const cargoBin = path.join(home, ".cargo", "bin");
  if (existsSync(cargoBin)) {
    process.env.PATH = `${cargoBin}${path.delimiter}${process.env.PATH}`;
  }
}

function readMinRustVersion() {
  const cargoToml = path.join(root, "src-tauri", "Cargo.toml");
  const text = readFileSync(cargoToml, "utf8");
  const m = /rust-version\s*=\s*"([^"]+)"/.exec(text);
  if (!m) {
    console.error("Не удалось прочитать rust-version из src-tauri/Cargo.toml");
    process.exit(1);
  }
  return m[1];
}

function ensureEnvLocal() {
  const example = path.join(root, ".env.example");
  const local = path.join(root, ".env.local");
  if (!existsSync(example)) {
    console.warn("Пропуск .env: нет файла .env.example");
    return;
  }
  if (existsSync(local)) {
    console.log("OK: .env.local уже существует");
    return;
  }
  copyFileSync(example, local);
  console.log("Создан .env.local из .env.example — добавьте OPENAI_API_KEY при необходимости.");
}

function getRustcVersion() {
  const r = spawnSync("rustc", ["-V"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (r.status !== 0 || !r.stdout) {
    return { ok: false, version: null, raw: r.stderr || r.stdout || "" };
  }
  const v = parseSemver(r.stdout);
  return { ok: true, version: v, raw: r.stdout.trim() };
}

function runRustupInstall() {
  console.log("Установка Rust через rustup (официальный установщик)…");
  if (process.platform === "win32") {
    const tmp = path.join(process.env.TEMP || process.env.TMP || ".", "rustup-init.exe");
    const safe = tmp.replace(/'/g, "''");
    const ps = [
      "$ProgressPreference = 'SilentlyContinue'",
      `Invoke-WebRequest -Uri 'https://win.rustup.rs/x86_64' -OutFile '${safe}'`,
      `& '${safe}' -y`,
    ].join("; ");
    const r = spawnSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps],
      { stdio: "inherit", cwd: root },
    );
    if (r.status !== 0) {
      console.error("Установка rustup не удалась. См. https://rustup.rs/");
      process.exit(1);
    }
  } else {
    const r = spawnSync(
      "sh",
      [
        "-c",
        "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y",
      ],
      { stdio: "inherit", cwd: root },
    );
    if (r.status !== 0) {
      console.error("Установка rustup не удалась. См. https://rustup.rs/");
      process.exit(1);
    }
  }
  prependCargoBinToPath();
  console.log(
    "Rust установлен. Если команды rustc/cargo не находятся, откройте новый терминал или выполните: source $HOME/.cargo/env (Unix).",
  );
}

function main() {
  const shouldInstallRust = process.argv.includes("--install-rust");
  const skipRust = process.argv.includes("--skip-rust");

  ensureEnvLocal();

  if (skipRust) {
    console.log(
      "Пропуск проверки Rust (--skip-rust). Для Tauri выполните setup без этого флага.",
    );
    console.log("Дальше: npm run dev — веб; npm run tauri:dev — нужен установленный Rust.");
    return;
  }

  const minStr = readMinRustVersion();
  const minVer = parseSemver(minStr);
  if (!minVer) {
    console.error("Некорректная rust-version в Cargo.toml:", minStr);
    process.exit(1);
  }

  prependCargoBinToPath();

  let rustc = getRustcVersion();
  if (!rustc.ok || !rustc.version) {
    console.warn("rustc не найден или не запускается.");
    console.warn(`Для сборки Tauri нужен Rust ${minStr} или новее.`);
    if (shouldInstallRust) {
      runRustupInstall();
      prependCargoBinToPath();
      rustc = getRustcVersion();
      if (!rustc.ok || !rustc.version) {
        console.error(
          "После установки rustup перезапустите терминал и снова выполните: npm run setup",
        );
        process.exit(1);
      }
    } else {
      console.warn("Повторите с флагом --install-rust для автоматической установки rustup.");
      console.warn("Или установите вручную: https://rustup.rs/");
      console.warn("Системные зависимости Tauri: https://v2.tauri.app/start/prerequisites/");
      process.exit(1);
    }
  }

  let c = cmpSemver(rustc.version, minVer);
  if (c === null) {
    process.exit(1);
  }
  if (c < 0) {
    console.warn(`Версия rustc слишком старая: ${rustc.raw}`);
    console.warn(`Нужно не ниже ${minStr}.`);
    if (shouldInstallRust) {
      console.log("Пробуем rustup update…");
      prependCargoBinToPath();
      const up = spawnSync("rustup", ["update", "stable"], {
        stdio: "inherit",
        shell: process.platform === "win32",
      });
      if (up.status !== 0) {
        process.exit(1);
      }
      rustc = getRustcVersion();
      c = cmpSemver(rustc.version, minVer);
      if (c === null || c < 0) {
        console.error("После обновления версия всё ещё ниже требуемой.");
        process.exit(1);
      }
    } else {
      console.warn("Выполните: rustup update stable");
      console.warn("Или снова запустите setup с --install-rust (если rustup ещё не ставили).");
      process.exit(1);
    }
  }

  console.log(`OK: ${rustc.raw} (минимум для проекта: ${minStr})`);
  console.log("Дальше: npm run dev — только веб; npm run tauri:dev — веб + окно Tauri.");
}

main();
