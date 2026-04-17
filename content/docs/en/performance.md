# Performance checklist

## Manual scenarios

1. **Long document** (many `docPage` blocks): typing at the bottom, Enter, no noticeable freezes.
2. **Zoom** 75% / 100% / 125%: pages stay stable; reflow completes without flicker.
3. **Window resize** (Tauri / browser): canvas and ruler stay aligned.
4. **Story / AI panels**: opening should not block typing for 1+ seconds (cold cache once is OK).

## DevTools

- **Performance** tab: record 5–10s of typing; watch **Long tasks** (>50 ms).
- **React Profiler** (if needed): extra `DocumentCanvas` commits when unrelated UI changes.

## Reflow (dev)

- `localStorage.setItem('DEBUG_REFLOW','1')` — console counter for `runPageLayout` calls per second.
- `localStorage.removeItem('DEBUG_REFLOW')` — disable.

## Bundle

- `npm run analyze` — bundle report after `next build`.

## Automated tests

- `npm test` — layout engine and other regressions.
- `src/lib/layout/pagination.snapshot.test.ts` — pagination snapshots on synthetic docs.

## Pagination invariants (do not break casually)

| Invariant | Location | Role |
|-----------|----------|------|
| `REFLOW_VIEWPORT_EPS_PX` | `src/lib/page-layout-engine/layout-metrics.ts` | Page height tolerance. |
| `layoutVersion` | `src/lib/layout/layoutVersion.ts` | Invalidates block height cache on font/zoom/margins. |

Single pagination entry: `runPageLayout` in `src/lib/page-layout-engine/runPageLayout.ts`. `NEXT_PUBLIC_PAGINATION_V2` reserved for future work (`migration-dual-read.ts`).
