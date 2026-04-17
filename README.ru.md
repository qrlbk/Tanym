<div align="center">

# Tanym

### AI-ориентированная студия для романов и длинной прозы

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TipTap](https://img.shields.io/badge/editor-TipTap-6B46C1?style=flat-square&logo=tiptap&logoColor=white)](https://tiptap.dev/)
[![Tauri](https://img.shields.io/badge/desktop-Tauri-FFC131?style=flat-square&logo=tauri&logoColor=black)](https://v2.tauri.app/)
[![License](https://img.shields.io/badge/License-Apache%202.0-3DA639?style=flat-square&logo=apache&logoColor=white)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933?style=flat-square&logo=node.js&logoColor=white)](package.json)
[![CI](https://img.shields.io/github/actions/workflow/status/qrlbk/Tanym/ci.yml?branch=main&label=CI&logo=githubactions&logoColor=white&style=flat-square)](https://github.com/qrlbk/Tanym/actions/workflows/ci.yml)

[English](README.md) · **Русский** · [Қазақша](README.kk.md)

<br/>

</div>

<p align="center">
  <sub>Язык по умолчанию: <strong>русский</strong> · весь проект · continuity · DOCX · полный офлайн (Ollama) по желанию</sub>
</p>

---

## <a id="toc"></a> Содержание

[Обзор](#overview) · [Автор](#author) · [Как появился Tanym](#story) · [Чем отличается](#features) · [Документация](#documentation) · [Требования](#requirements) · [Установка](#setup) · [Переменные среды](#environment) · [Запуск](#running) · [npm-скрипты](#npm-scripts) · [Лицензия](#license)

---

## <a id="overview"></a> Обзор

**AI-редактор для авторов романов и длинной прозы на русском.** Знает ваш проект целиком: персонажей, главы, сцены, противоречия сюжета.

Исходный код — **Apache License 2.0** — см. [LICENSE](LICENSE) и [NOTICE](NOTICE). Участие: [CONTRIBUTING.md](CONTRIBUTING.md) · Сообщество: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

---

## <a id="author"></a> Автор

| | |
| --- | --- |
| **Мейнтейнер** | **Kuralbek Adilet** |
| **Почта** | [kuralbekadilet475@gmail.com](mailto:kuralbekadilet475@gmail.com) |
| **Репозиторий** | [github.com/qrlbk/Tanym](https://github.com/qrlbk/Tanym) |

---

## <a id="story"></a> Как появился Tanym

Проект делает **один разработчик** — я сам пишу код и **активно использую ИИ** (подсказки, рефакторинг, документацию): это нормально для современной инди-разработки; важно, что продукт и архитектура остаются под моим контролем.

Идея была простой: когда **закончилась лицензия на Word**, я думал сделать **свою копию Word** — привычный интерфейс, страницы, документы. Скоро я **переосмыслил задачу**: мне не нужен был офисный редактор ради офиса. Я хотел **писать миры** — романы, сцены, персонажей — и чтобы инструмент помогал **автору длинной прозы**, а не «оформлял отчёты». Так Tanym стал проектом **для себя**: под мой язык, сценарий работы и любовь к большим историям. Что другие авторы тоже могут им пользоваться — приятный бонус open source.

Клиент — **Next.js** (TipTap), редактор в стиле ленты, DOCX, оболочка **Tauri**. Writer-copilot понимает структуру книги (главы → сцены → персонажи), ищет нестыковки в сюжете и может править любую сцену проекта, не только открытую.

---

## <a id="features"></a> Чем отличается

| | |
| :--- | :--- |
| **Весь проект, не один файл** | AI видит главы, сцены, карточки персонажей и может править сцены, где вас сейчас нет. |
| **Continuity сюжета** | Векторный индекс и правила находят нестыковки между сценами. |
| **Карточки персонажей + AI** | Модель предлагает обновления при новых фактах; вы подтверждаете. |
| **Полный офлайн (Ollama)** | «Полностью офлайн» — роман не уходит в облако; AI и эмбеддинги локально (Llama 3, Qwen2.5, `nomic-embed-text`). См. `.env.example` и `OLLAMA_BASE_URL`. |
| **Русский по умолчанию** | Терминология, UI и промпты под русский; без «переучивания» с англоязычных инструментов. |
| **Лента + DOCX** | Привычная лента, DOCX в обе стороны. |

---

## <a id="documentation"></a> Документация

**Веб (EN / RU / KK):** после `npm run dev` — [http://localhost:3000/docs](http://localhost:3000/docs) (редирект на `/docs/en`). После `npm run build` статика в `out/docs/…`.

| Ресурс | Описание |
| ------ | -------- |
| [docs/README.md](docs/README.md) | Оглавление и ссылки на `content/docs` |
| [content/docs/](content/docs/) | Исходники статей (Markdown по языкам) |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Указатель → полный текст в веб `/docs/…/development` |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Указатель → полный текст `/docs/…/architecture` |
| [docs/DISTRIBUTION.md](docs/DISTRIBUTION.md) | Указатель → полный текст `/docs/…/distribution` |
| [docs/PERFORMANCE.md](docs/PERFORMANCE.md) | Указатель → полный текст `/docs/…/performance` |
| [docs/OPEN_SOURCE.md](docs/OPEN_SOURCE.md) | Указатель → полный текст `/docs/…/open-source` |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Как вносить вклад |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Правила сообщества |
| [SECURITY.md](SECURITY.md) | Уязвимости |
| [CHANGELOG.md](CHANGELOG.md) | История изменений |
| [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) | Сторонние лицензии |

---

## <a id="requirements"></a> Требования

- **Node.js 20+** и **npm** — версия в [`package.json`](package.json) (`engines`); с [nvm](https://github.com/nvm-sh/nvm) выполните `nvm use` ([`.nvmrc`](.nvmrc) в корне).
- **Только веб:** Rust не нужен.
- **Десктоп (Tauri):** [Rust](https://rustup.rs/) не ниже [`src-tauri/Cargo.toml`](src-tauri/Cargo.toml) (`rust-version`), плюс [prerequisites Tauri v2](https://v2.tauri.app/start/prerequisites/).

Node из репозитория не ставится — [nodejs.org](https://nodejs.org/) или nvm/Homebrew.

---

## <a id="setup"></a> Установка одной командой

Из корня после клонирования:

**macOS / Linux**

```bash
bash setup.sh
```

или `./setup.sh`, если исполняемый (`chmod +x setup.sh`).

**Windows (PowerShell)**

```powershell
.\setup.ps1
```

Выполняет `npm install`, затем [`scripts/setup.mjs`](scripts/setup.mjs): `.env.local` из `.env.example` (если нет), проверка `rustc` для Tauri.

**Только веб** (без Rust):

```bash
bash setup.sh --skip-rust
```
```powershell
.\setup.ps1 --skip-rust
```

**Установка rustup** (Rust отсутствует или старый — [rustup.rs](https://rustup.rs/)):

```bash
bash setup.sh --install-rust
```
```powershell
.\setup.ps1 --install-rust
```

Если зависимости npm уже есть:

```bash
npm run setup
```

Примеры: `npm run setup -- --install-rust` · `npm run setup -- --skip-rust`

После первой установки rustup может понадобиться **новый терминал**, затем снова `npm run setup`.

---

## <a id="environment"></a> Переменные окружения

`.env.local` создаётся при setup из `.env.example`. Ключ для ИИ:

```bash
OPENAI_API_KEY=...
```

---

## <a id="running"></a> Запуск (после установки)

| Цель | Команда |
| ---- | ------- |
| Только веб (Next.js в браузере) | `npm run dev` |
| Веб + окно Tauri | `npm run tauri:dev` |
| Продакшен веб | `npm run build` → `npm run start` |
| Десктоп | `npm run tauri:build` |

---

## <a id="npm-scripts"></a> Скрипты npm

| Команда | Описание |
| ------- | -------- |
| `npm run setup` | `.env.local` из примера; проверка Rust; `--install-rust`, `--skip-rust` |
| `npm run dev` | Разработка (веб) |
| `npm run build` | Продакшен-сборка |
| `npm run start` | Запуск после сборки |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |
| `npm run tauri:dev` | Десктоп, dev |
| `npm run tauri:build` | Сборка десктопа |

---

## <a id="license"></a> Лицензия

Исходный код — **[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)**.  
Текст: [LICENSE](LICENSE) · атрибуция: [NOTICE](NOTICE).

Зависимости (npm, crates.io) имеют **свои** лицензии — [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

`"private": true` в [`package.json`](package.json) только мешает случайной публикации в npm; Apache-2.0 для кода **не отменяет**.

Имеет смысл заполнить `repository`, `homepage`, `bugs` в `package.json` ([docs/OPEN_SOURCE.md](docs/OPEN_SOURCE.md)).
