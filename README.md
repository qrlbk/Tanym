# Tanym

[License](LICENSE)
[Node](package.json)

**AI-редактор для авторов романов и длинной прозы на русском.** Знает ваш проект целиком: персонажей, главы, сцены, противоречия сюжета.

Исходный код распространяется под **Apache License 2.0** — см. [LICENSE](LICENSE) и [NOTICE](NOTICE). Участие в разработке: [CONTRIBUTING.md](CONTRIBUTING.md), этика общения: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Автор

**Kuralbek Adilet** — создатель и ведущий мейнтейнер.  
Почта: [kuralbekadilet475@gmail.com](mailto:kuralbekadilet475@gmail.com).  
Репозиторий: [github.com/qrlbk/Tanym](https://github.com/qrlbk/Tanym).

### Как появился Tanym

Проект делает **один разработчик** — я сам пишу код и в работе **активно использую ИИ** (подсказки, рефакторинг, документацию): это честно и нормально для современной инди-разработки; важно, что продукт и архитектура остаются под моим контролем.

Идея родилась просто: когда у меня **закончилась лицензия на Word**, я сначала думал сделать что-то вроде **своей копии Word** — привычный интерфейс, страницы, документы. Но довольно быстро я **переосмыслил задачу**: мне не нужен был ещё один офисный редактор ради офиса. Я хотел **писать миры** — романы, сцены, персонажей, — и чтобы инструмент помогал именно **автору длинной прозы**, а не «оформлял отчёты». Так Tanym стал проектом **для себя**: под мой язык, мой сценарий работы и мою любовь к большим историям. То, что им могут воспользоваться и другие авторы, — приятный бонус open source.

Клиент на Next.js (TipTap) со страницами A4, импортом и экспортом DOCX и десктопной оболочкой Tauri. Writer-copilot понимает структуру книги (главы → сцены → персонажи), ищет нестыковки в сюжете и может править любую сцену проекта, а не только открытую.

## Чем отличается от Google Docs / Scrivener и классических офисных редакторов

- **Знает весь проект, а не только открытый файл.** AI видит главы, сцены, карточки персонажей и может править сцены, в которых вас сейчас нет.
- **Проверяет противоречия сюжета (continuity).** Векторный индекс по тексту и правила-детекторы находят нестыковки между сценами.
- **Карточки персонажей с AI-апрувом.** Модель предлагает обновления персонажа при появлении новых фактов; вы подтверждаете.
- **Полностью офлайн через Ollama.** Включите «Полностью офлайн» — и роман не уходит в облако: AI и эмбеддинги считаются локально (Llama 3, Qwen2.5, `nomic-embed-text`). См. `.env.example` и `OLLAMA_BASE_URL`.
- **Русскоязычный по умолчанию.** Вся терминология, UI и промпты заточены под русский; не требует переучивания с английских Novelcrafter/Sudowrite.
- **Привычная лента и страницы A4.** Вкладки ленты, разметка страницы, DOCX в обе стороны.

## Документация

**Веб-раздел (EN / RU / KK):** после `npm run dev` откройте [http://localhost:3000/docs](http://localhost:3000/docs) (редирект на `/docs/en`). После `npm run build` статика в `out/docs/…`.

| Ресурс | Описание |
| ------ | -------- |
| [docs/README.md](docs/README.md) | Оглавление и ссылки на `content/docs` |
| [content/docs/](content/docs/) | Исходники статей (Markdown по языкам) |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Указатель; полный текст — веб `/docs/…/development` |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Указатель; полный текст — веб `/docs/…/architecture` |
| [docs/DISTRIBUTION.md](docs/DISTRIBUTION.md) | Указатель; полный текст — веб `/docs/…/distribution` |
| [docs/PERFORMANCE.md](docs/PERFORMANCE.md) | Указатель; полный текст — веб `/docs/…/performance` |
| [docs/OPEN_SOURCE.md](docs/OPEN_SOURCE.md) | Указатель; полный текст — веб `/docs/…/open-source` |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Как вносить вклад (PR, стиль, тесты) |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Правила сообщества |
| [SECURITY.md](SECURITY.md) | Сообщения об уязвимостях |
| [CHANGELOG.md](CHANGELOG.md) | История изменений |
| [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) | Сторонние компоненты и лицензии |


## Требования

- **Node.js 20+** и **npm** (версия Node зафиксирована в `[package.json](package.json)` в поле `engines`; при использовании [nvm](https://github.com/nvm-sh/nvm) можно выполнить `nvm use` — в корне есть `[.nvmrc](.nvmrc)`).
- **Только веб** (браузер): Rust не обязателен.
- **Десктоп (Tauri)**: [Rust](https://rustup.rs/) не ниже версии из `[src-tauri/Cargo.toml](src-tauri/Cargo.toml)` (`rust-version`), плюс системные зависимости для вашей ОС — см. [официальные prerequisites Tauri v2](https://v2.tauri.app/start/prerequisites/).

Node.js из репозитория автоматически не ставится: сначала установите его с [nodejs.org](https://nodejs.org/) или через nvm/Homebrew и т.п.

## Установка одной командой

После клонирования репозитория из корня проекта:

**macOS / Linux**

```bash
bash setup.sh
```

или `./setup.sh`, если файлу выданы права на выполнение (`chmod +x setup.sh`).

**Windows** (PowerShell)

```powershell
.\setup.ps1
```

Скрипт выполняет `npm install`, затем `[scripts/setup.mjs](scripts/setup.mjs)`: создаёт `.env.local` из `.env.example` (если его ещё нет), проверяет наличие `rustc` нужной версии для Tauri.

Если нужен **только веб** и Rust ставить не планируете, используйте:

```bash
bash setup.sh --skip-rust
```

```powershell
.\setup.ps1 --skip-rust
```

Если Rust не установлен или версия слишком старая, повторите с автоматической установкой **rustup** (меняет систему — официальный установщик с [rustup.rs](https://rustup.rs/)):

```bash
bash setup.sh --install-rust
```

```powershell
.\setup.ps1 --install-rust
```

Если зависимости npm уже установлены, достаточно:

```bash
npm run setup
```

Аргументы `npm run setup` передаются в скрипт после `--`, например:

- `npm run setup -- --install-rust`
- `npm run setup -- --skip-rust`

После первой установки rustup иногда нужно **открыть новый терминал**, затем снова `npm run setup`.

## Переменные окружения

Файл `.env.local` создаётся при setup из `.env.example`. Подставьте ключ для функций ИИ:

```bash
OPENAI_API_KEY=...
```

## Запуск (после установки)


| Цель                                                                  | Команда                               |
| --------------------------------------------------------------------- | ------------------------------------- |
| Только веб (Next.js в браузере)                                       | `npm run dev`                         |
| Веб + нативное окно Tauri (dev-сервер Next поднимается автоматически) | `npm run tauri:dev`                   |
| Продакшен-сборка веба                                                 | `npm run build` затем `npm run start` |
| Сборка десктопного приложения                                         | `npm run tauri:build`                 |


## Скрипты npm


| Команда               | Описание                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| `npm run setup`       | `.env.local` из примера; проверка Rust для Tauri; флаги `--install-rust`, `--skip-rust` (см. выше) |
| `npm run dev`         | Режим разработки (веб)                                                                             |
| `npm run build`       | Сборка продакшена                                                                                  |
| `npm run start`       | Запуск после сборки                                                                                |
| `npm run lint`        | ESLint                                                                                             |
| `npm run test`        | Vitest                                                                                             |
| `npm run tauri:dev`   | Десктоп (Tauri) в режиме разработки                                                                |
| `npm run tauri:build` | Сборка десктоп-приложения                                                                          |


## Лицензия

Исходный код репозитория — **[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)**.
Текст лицензии: [LICENSE](LICENSE); атрибуция при распространении: [NOTICE](NOTICE).

Зависимости (npm, crates.io) имеют **собственные** лицензии — см.
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Поле `"private": true` в `[package.json](package.json)` только предотвращает
случайную публикацию пакета в npm; оно **не** отменяет Apache-2.0 для исходного кода.

После публикации на GitHub имеет смысл заполнить в `package.json` поля
`repository`, `homepage` и `bugs` (см. [docs/OPEN_SOURCE.md](docs/OPEN_SOURCE.md)).