# Әзірлеу

Стек пен репозиторий құрылымының қысқаша шолуы. Толық орнату нұсқаулығы — [README](https://github.com/qrlbk/Tanym#readme).

## Орналасу

**Tanym** — орыс тілінде бірінші кезекте ұсынылатын, романдар мен ұзақ проза үшін AI-жазу ортасы. Ядросы — бүкіл жобаны түсінетін writer copilot (`StoryProject → Chapter → Scene → Character`), кросс-сцена түзетулері және сюжет үздіксіздігін тексеру.

Даулы жағдайда бағдар — **жеке роман авторы**, кеңсе пакеті емес. Mail merge, академиялық сілтемелер және шарт үлгілері әдейі қолданылмайды.

## Стек

| Қабат | Технология |
|-------|------------|
| UI | React 19, Next.js 16, Tailwind CSS 4 |
| Редактор | TipTap 3, ProseMirror (`@tiptap/pm`) |
| Күй | Zustand |
| Десктоп | Tauri 2 (`src-tauri/`) |
| Тесттер | Vitest |

## Каталог құрылымы

| Жол | Мақсаты |
|-----|---------|
| `src/app/` | Next.js App Router |
| `src/components/` | UI, лента, редактор |
| `src/components/Editor/` | Редактор провайдері, TipTap кеңейтулері |
| `src/lib/` | Утилиталар, AI, файлдар |
| `src/stores/` | Zustand |
| `src-tauri/` | Rust + Tauri |
| `scripts/` | `setup.mjs` т.б. |

## Командалар

| Команда | Мақсаты |
|---------|---------|
| `npm run dev` | Веб әзірлеу |
| `npm run build` | Next.js жинағы |
| `npm run tauri:dev` | Tauri терезесімен әзірлеу |
| `npm run tauri:build` | Десктоп релизі |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |

## Next.js

Маршруттау, конфиг немесе API өзгертпес бұрын орнатылған пакеттегі `node_modules/next/dist/docs/` құжаттарын қараңыз.

## Орта айнымалылары

`.env.example` және README. API кілттерін коммиттемеңіз.

## Қосымша

- [Сәулет](/docs/kk/architecture)
- [Ашық код тексерімі](/docs/kk/open-source)
