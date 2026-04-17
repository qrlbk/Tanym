<div align="center">

# Tanym

### Роман мен ұзын проза үшін AI-бағдарлы жазу студиясы

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TipTap](https://img.shields.io/badge/editor-TipTap-6B46C1?style=flat-square&logo=tiptap&logoColor=white)](https://tiptap.dev/)
[![Tauri](https://img.shields.io/badge/desktop-Tauri-FFC131?style=flat-square&logo=tauri&logoColor=black)](https://v2.tauri.app/)
[![License](https://img.shields.io/badge/License-Apache%202.0-3DA639?style=flat-square&logo=apache&logoColor=white)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933?style=flat-square&logo=node.js&logoColor=white)](package.json)
[![CI](https://img.shields.io/github/actions/workflow/status/qrlbk/Tanym/ci.yml?branch=main&label=CI&logo=githubactions&logoColor=white&style=flat-square)](https://github.com/qrlbk/Tanym/actions/workflows/ci.yml)

[English](README.md) · [Русский](README.ru.md) · **Қазақша**

<br/>

</div>

<p align="center">
  <sub>Әдепкі тіл: <strong>орыс</strong> · бүкіл жоба · continuity · DOCX · толық офлайн (Ollama) қалауы бойынша</sub>
</p>

---

## <a id="toc"></a> Мазмұны

[Шолу](#overview) · [Автор](#author) · [Tanym қалай пайда болды](#story) · [Ерекшеліктері](#features) · [Құжаттама](#documentation) · [Талаптар](#requirements) · [Орнату](#setup) · [Орта айнымалылары](#environment) · [Іске қосу](#running) · [npm скрипттері](#npm-scripts) · [Лицензия](#license)

---

## <a id="overview"></a> Шолу

**Роман жазушылар мен ұзын проза авторлары үшін AI-редактор, әдепкі жазу тілі — орыс.** Бүкіл жобаңызды түсінеді: кейіпкерлер, тараулар, сценалар, сюжет қайшылықтары.

Бастапқы код **Apache License 2.0** — [LICENSE](LICENSE) және [NOTICE](NOTICE). Қатысу: [CONTRIBUTING.md](CONTRIBUTING.md) · Қауымдастық: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

---

## <a id="author"></a> Автор

| | |
| --- | --- |
| **Мейнтейнер** | **Kuralbek Adilet** |
| **Пошта** | [kuralbekadilet475@gmail.com](mailto:kuralbekadilet475@gmail.com) |
| **Репозиторий** | [github.com/qrlbk/Tanym](https://github.com/qrlbk/Tanym) |

---

## <a id="story"></a> Tanym қалай пайда болды

Жобаны **бір әзірлеуші** жасайды — кодты өзім жазамын және жұмыста **AI-ды белсенді қолданамын** (ұсыныстар, рефакторинг, құжаттама): бұл заманауи инди-дамыту үшін қалыпты; маңыздысы — өнім мен архитектура менің бақылауымда қалады.

Ой қарапайым еді: **Word лицензиям біткенде** алдымен **өз Word-ымды** жасау ойладым — таныс интерфейс, беттер, құжаттар. Тез **мақсатты қайта ойладым**: кеңсе үшін тағы бір кеңсе редакторы керек емес еді. Мен **әлемдер жазғым келді** — романдар, сценалар, кейіпкерлер — және құрал **ұзын проза авторына** көмектесуі керек еді. Сондықтан Tanym **өзіме арналған** жобаға айналды. Басқа авторлар да пайдалана алуы — ашық кодтың бонусы.

Клиент — **Next.js** (TipTap), A4 беттер, DOCX, **Tauri** қабы. Writer-copilot кітап құрылымын түсінеді, сюжетті тексереді және жобаның кез келген сценасын өңдей алады.

---

## <a id="features"></a> Ерекшеліктері

| | |
| :--- | :--- |
| **Бүкіл жоба, бір файл емес** | AI тарауларды, сценаларды, кейіпкер карталарын көреді және сіз тұрмаған сценаларды да өңдей алады. |
| **Сюжет үздіксіздігі** | Векторлық индекс пен ережелер сценалар арасындағы қайшылықтарды табады. |
| **Кейіпкер карталары + AI** | Жаңа фактілерде модель жаңартуды ұсынады; сіз растайсыз. |
| **Толық офлайн (Ollama)** | «Толық офлайн» — роман бұлтқа кетпейді; AI мен эмбеддингтер жергілікті. Қараңыз `.env.example`, `OLLAMA_BASE_URL`. |
| **Әдепкі орыс тілі** | Терминология, UI, промпттар орысқа бейімделген. |
| **Лента + A4** | Лента, бет орналасуы, DOCX екі бағытта да. |

---

## <a id="documentation"></a> Құжаттама

**Веб (EN / RU / KK):** `npm run dev` кейін [http://localhost:3000/docs](http://localhost:3000/docs) (`/docs/en` редиректі). `npm run build` кейін статика `out/docs/…`.

| Ресурс | Сипаттама |
| ------ | --------- |
| [docs/README.md](docs/README.md) | Мазмұны және `content/docs` сілтемелері |
| [content/docs/](content/docs/) | Мақалалардың бастапқы файлдары |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Көрсеткіш → толық мәтін вебте |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Көрсеткіш → толық мәтін |
| [docs/DISTRIBUTION.md](docs/DISTRIBUTION.md) | Көрсеткіш → толық мәтін |
| [docs/PERFORMANCE.md](docs/PERFORMANCE.md) | Көрсеткіш → толық мәтін |
| [docs/OPEN_SOURCE.md](docs/OPEN_SOURCE.md) | Көрсеткіш → толық мәтін |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Қалай үлес қосуға болады |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Қауымдастық ережелері |
| [SECURITY.md](SECURITY.md) | Қауіпсіздік |
| [CHANGELOG.md](CHANGELOG.md) | Тарих |
| [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) | Үшінші тарап лицензиялары |

---

## <a id="requirements"></a> Талаптар

- **Node.js 20+** және **npm** — нұсқа [`package.json`](package.json) (`engines`); [nvm](https://github.com/nvm-sh/nvm) үшін `nvm use` ([`.nvmrc`](.nvmrc)).
- **Тек веб:** Rust міндетті емес.
- **Десктоп (Tauri):** [Rust](https://rustup.rs/) кем дегенде [`src-tauri/Cargo.toml`](src-tauri/Cargo.toml) (`rust-version`), плюс [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/).

Node репозиторийден автоматты орнатылмайды — [nodejs.org](https://nodejs.org/) немесе nvm/Homebrew.

---

## <a id="setup"></a> Бір командамен орнату

Клондағаннан кейін түбірден:

**macOS / Linux**

```bash
bash setup.sh
```

немесе `./setup.sh` (`chmod +x setup.sh`).

**Windows (PowerShell)**

```powershell
.\setup.ps1
```

`npm install`, содан кейін [`scripts/setup.mjs`](scripts/setup.mjs): `.env.local` ← `.env.example`, `rustc` тексеру.

**Тек веб:**

```bash
bash setup.sh --skip-rust
```
```powershell
.\setup.ps1 --skip-rust
```

**rustup** ([rustup.rs](https://rustup.rs/)):

```bash
bash setup.sh --install-rust
```
```powershell
.\setup.ps1 --install-rust
```

Тәуелділіктер бар болса:

```bash
npm run setup
```

Мысалдар: `npm run setup -- --install-rust` · `npm run setup -- --skip-rust`

rustup алғаш орнатқаннан кейін **жаңа терминал** қажет болуы мүмкін.

---

## <a id="environment"></a> Орта айнымалылары

`.env.local` орнату кезінде `.env.example`-дан жасалады:

```bash
OPENAI_API_KEY=...
```

---

## <a id="running"></a> Іске қосу (орнатқаннан кейін)

| Мақсат | Команда |
| ------ | ------- |
| Тек веб | `npm run dev` |
| Веб + Tauri | `npm run tauri:dev` |
| Продакшен веб | `npm run build` → `npm run start` |
| Десктоп | `npm run tauri:build` |

---

## <a id="npm-scripts"></a> npm скрипттері

| Команда | Сипаттама |
| ------- | --------- |
| `npm run setup` | `.env.local`; Rust тексеру; `--install-rust`, `--skip-rust` |
| `npm run dev` | Даму (веб) |
| `npm run build` | Продакшен жинағы |
| `npm run start` | Жинаудан кейін |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |
| `npm run tauri:dev` | Десктоп, dev |
| `npm run tauri:build` | Десктоп жинағы |

---

## <a id="license"></a> Лицензия

Бастапқы код — **[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)**.  
Мәтін: [LICENSE](LICENSE) · атрибуция: [NOTICE](NOTICE).

Тәуелділіктердің **өз** лицензиялары бар — [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

`"private": true` [`package.json`](package.json) тек npm-ге кездейсоқ жариялауды болдырмайды; Apache-2.0-ды **жоймайды**.

`repository`, `homepage`, `bugs` толтыруды ойлаңыз ([docs/OPEN_SOURCE.md](docs/OPEN_SOURCE.md)).
