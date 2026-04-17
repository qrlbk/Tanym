# E2E тесты (Playwright)

Минимальный скаффолд. Сейчас тут один smoke-тест, остальные сценарии фазы 2
остаются TODO (см. комментарий в `playwright.config.ts`).

## Запуск локально

```bash
npx playwright install chromium
npm run e2e
```

Playwright сам поднимет `npm run dev -- --port 3010` и прогонит тесты.

## В CI

В `.github/workflows/ci.yml` e2e пока не подключён как обязательная job —
сначала стабилизируем полный флоу (open project → create scene → AI → DOCX),
потом добавим отдельной job с `playwright install --with-deps`.
