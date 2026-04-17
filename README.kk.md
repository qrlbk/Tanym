# Tanym

**Тілдер:** [English](README.md) · [Русский](README.ru.md) · Қазақша (бұл файл)

[License](LICENSE)
[Node](package.json)

**Роман жазушылар мен ұзын проза авторлары үшін AI-редактор, әдепкі жазу тілі — орыс.** Бүкіл жобаңызды түсінеді: кейіпкерлер, тараулар, сценалар, сюжет қайшылықтары.

Бастапқы код **Apache License 2.0** бойынша таратылады — [LICENSE](LICENSE) және [NOTICE](NOTICE). Қатысу: [CONTRIBUTING.md](CONTRIBUTING.md), қауымдастық ережелері: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Автор

**Kuralbek Adilet** — жоба авторы және басты мейнтейнер.  
Пошта: [kuralbekadilet475@gmail.com](mailto:kuralbekadilet475@gmail.com).  
Репозиторий: [github.com/qrlbk/Tanym](https://github.com/qrlbk/Tanym).

### Tanym қалай пайда болды

Жобаны **бір әзірлеуші** жасайды — кодты өзім жазамын және жұмыста **AI-ды белсенді қолданамын** (ұсыныстар, рефакторинг, құжаттама): бұл заманауи инди-дамыту үшін қалыпты нәрсе; маңыздысы — өнім мен архитектура менің бақылауымда қалады.

Ой қарапайым еді: **Word лицензиям біткенде** алдымен **өз Word-ымды** жасау ойладым — таныс интерфейс, беттер, құжаттар. Бірақ тез **мақсатты қайта ойладым**: маған кеңсе үшін тағы бір кеңсе редакторы керек емес еді. Мен **әлемдер жазғым келді** — романдар, сценалар, кейіпкерлер — және құрал **ұзын проза авторына** көмектесуі керек еді, «есептерді безендіру» емес. Сондықтан Tanym **өзіме арналған** жобаға айналды: тіліме, жұмыс сценарийіме және үлкен әңгімелерге деген сүйіспеншілігіме бейімделді. Басқа авторлар да пайдалана алуы — ашық кодтың жағымды бонусы.

Клиент — Next.js (TipTap), A4 беттері, DOCX импорт/экспорт және Tauri десктоп қабы. Writer-copilot кітап құрылымын түсінеді (тараулар → сценалар → кейіпкерлер), сюжеттегі сәйкессіздіктерді табады және жобаның кез келген сценасын өңдей алады, тек ашылғанын ғана емес.

## Google Docs / Scrivener және классикалық кеңсе редакторларынан айырмашылығы

- **Бүкіл жобаны біледі, тек ашылған файлды емес.** AI тарауларды, сценаларды, кейіпкер карталарын көреді және сіз қазір тұрмаған сценаларды да өңдей алады.
- **Сюжет үздіксіздігін (continuity) тексереді.** Мәтін бойынша векторлық индекс және ережелер сценалар арасындағы қайшылықтарды табады.
- **AI мақұлдауы бар кейіпкер карталары.** Жаңа фактілер пайда болғанда модель кейіпкерді жаңартуды ұсынады; сіз растайсыз.
- **Ollama арқылы толық офлайн.** «Толық офлайн» қосыңыз — романыңыз бұлтқа кетпейді: AI және эмбеддингтер жергілікті (Llama 3, Qwen2.5, `nomic-embed-text`). Қараңыз `.env.example` және `OLLAMA_BASE_URL`.
- **Әдепкі орыс тілінде.** Терминология, интерфейс және промпттар орысқа бейімделген; Novelcrafter/Sudowrite сияқты ағылшын құралдарынан «қайта үйренуді» талап етпейді.
- **Таныс лента және A4 беттер.** Лента қойындылары, бет орналасуы, DOCX екі бағытта да.

## Құжаттама

**Веб-бөлік (EN / RU / KK):** `npm run dev` кейін [http://localhost:3000/docs](http://localhost:3000/docs) ашыңыз (редирект `/docs/en`). `npm run build` кейін статика `out/docs/…` ішінде.

| Ресурс | Сипаттама |
| ------ | --------- |
| [docs/README.md](docs/README.md) | Мазмұны және `content/docs` сілтемелері |
| [content/docs/](content/docs/) | Мақалалардың бастапқы файлдары (тіл бойынша Markdown) |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Көрсеткіш; толық мәтін вебте `/docs/…/development` |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Көрсеткіш; толық мәтін вебте `/docs/…/architecture` |
| [docs/DISTRIBUTION.md](docs/DISTRIBUTION.md) | Көрсеткіш; толық мәтін вебте `/docs/…/distribution` |
| [docs/PERFORMANCE.md](docs/PERFORMANCE.md) | Көрсеткіш; толық мәтін вебте `/docs/…/performance` |
| [docs/OPEN_SOURCE.md](docs/OPEN_SOURCE.md) | Көрсеткіш; толық мәтін вебте `/docs/…/open-source` |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Қалай үлес қосуға болады (PR, стиль, тесттер) |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Қауымдастық ережелері |
| [SECURITY.md](SECURITY.md) | Қауіпсіздік мәселелерін хабарлау |
| [CHANGELOG.md](CHANGELOG.md) | Өзгерістер тарихы |
| [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) | Үшінші тарап компоненттері және лицензиялар |


## Талаптар

- **Node.js 20+** және **npm** (Node нұсқасы `[package.json](package.json)` ішіндегі `engines`-те бекітілген; [nvm](https://github.com/nvm-sh/nvm) үшін `nvm use` — түбірде `[.nvmrc](.nvmrc)` бар).
- **Тек веб** (браузер): Rust міндетті емес.
- **Десктоп (Tauri)**: [Rust](https://rustup.rs/) кем дегенде `[src-tauri/Cargo.toml](src-tauri/Cargo.toml)` нұсқасындағыдай (`rust-version`), плюс ЖЖ-ға тәуелділік — [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/).

Node.js репозиторийден автоматты орнатылмайды: алдымен [nodejs.org](https://nodejs.org/) немесе nvm/Homebrew арқылы орнатыңыз.

## Бір командамен орнату

Клондағаннан кейін жоба түбірінен:

**macOS / Linux**

```bash
bash setup.sh
```

немесе `./setup.sh`, егер файл орындалатын болса (`chmod +x setup.sh`).

**Windows** (PowerShell)

```powershell
.\setup.ps1
```

Скрипт `npm install` орындайды, содан кейін `[scripts/setup.mjs](scripts/setup.mjs)`: `.env.example`-дан `.env.local` жасайды (жоқ болса) және Tauri үшін `rustc` нұқсасын тексереді.

Егер **тек веб** керек болса және Rust орнатқыңыз келмесе:

```bash
bash setup.sh --skip-rust
```

```powershell
.\setup.ps1 --skip-rust
```

Rust жоқ немесе ескірген болса, **rustup** автоматты орнатумен қайталаңыз ([rustup.rs](https://rustup.rs/)):

```bash
bash setup.sh --install-rust
```

```powershell
.\setup.ps1 --install-rust
```

npm тәуелділіктері орнатылған болса:

```bash
npm run setup
```

`npm run setup` аргументтерін `--` кейін жіберіңіз, мысалы:

- `npm run setup -- --install-rust`
- `npm run setup -- --skip-rust`

rustup алғаш орнатқаннан кейін **жаңа терминал** ашу керек болуы мүмкін, содан кейін қайта `npm run setup`.

## Орта айнымалылары

`.env.local` орнату кезінде `.env.example`-дан жасалады. AI функциялары үшін кілтті қосыңыз:

```bash
OPENAI_API_KEY=...
```

## Іске қосу (орнатқаннан кейін)


| Мақсат | Команда |
| ------ | ------- |
| Тек веб (Next.js браузерде) | `npm run dev` |
| Веб + Tauri терезесі (Next dev сервері автоматты) | `npm run tauri:dev` |
| Веб продакшен жинағы | `npm run build` содан кейін `npm run start` |
| Десктоп қолданбасын жинау | `npm run tauri:build` |


## npm скрипттері


| Команда | Сипаттама |
| ------- | --------- |
| `npm run setup` | `.env.local` мысалдан; Tauri үшін Rust тексеру; `--install-rust`, `--skip-rust` (жоғарыда) |
| `npm run dev` | Даму режимі (веб) |
| `npm run build` | Продакшен жинағы |
| `npm run start` | Жинаудан кейін іске қосу |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |
| `npm run tauri:dev` | Десктоп (Tauri) даму режимінде |
| `npm run tauri:build` | Десктоп қолданбасын жинау |


## Лицензия

Репозиторийдің бастапқы коды — **[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)**.  
Лицензия мәтіні: [LICENSE](LICENSE); таратуда атрибуция: [NOTICE](NOTICE).

Тәуелділіктер (npm, crates.io) **өз** лицензияларына ие — [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

`[package.json](package.json)` ішіндегі `"private": true` тек npm-ге кездейсоқ жариялауды болдырмайды; бастапқы код үшін Apache-2.0-ды **жоймайды**.

GitHub-та жариялағаннан кейін `package.json` ішінде `repository`, `homepage`, `bugs` толтыруды ойлаңыз ([docs/OPEN_SOURCE.md](docs/OPEN_SOURCE.md)).
