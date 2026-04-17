# Өнімділік — тексерім тізімі

## Қолмен сценарийлер

1. **Ұзақ құжат** — төменде теру, Enter, фриз жоқ.
2. **Масштаб** 75–125% — беттер тұрақты.
3. **Терезе өлшемі** — холст пен сызғыш үйлесімді.
4. **Story / AI панельдері** — теруді ұзақ блоктамау.

## DevTools

Performance: Long tasks >50 ms. React Profiler: артық `DocumentCanvas` коммиттері.

## Reflow

`localStorage.setItem('DEBUG_REFLOW','1')` — `runPageLayout` санағы. Жою — өшіру.

## Бандл

`npm run analyze`

## Тесттер

`npm test`, `pagination.snapshot.test.ts`

## Пагинация инварианттары

`REFLOW_VIEWPORT_EPS_PX` (`layout-metrics.ts`), `layoutVersion` (`layoutVersion.ts`). Кіру нүктесі: `runPageLayout`.
