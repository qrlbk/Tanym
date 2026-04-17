# Документация Tanym

**Создатель проекта:** Kuralbek Adilet — [kuralbekadilet475@gmail.com](mailto:kuralbekadilet475@gmail.com).

## Веб-документация (3 языка)

В приложении Next.js есть раздел **`/docs`** с переключателем **EN · RU · KK**. По умолчанию — английский (`/docs/en`).

| Действие | URL / путь |
|----------|------------|
| Dev-сервер | [http://localhost:3000/docs](http://localhost:3000/docs) → редирект на `/docs/en` |
| Статика после сборки | `out/docs/en/index.html`, `out/docs/ru/…`, `out/docs/kk/…` |
| Исходники текстов | [content/docs/](../content/docs/) — каталоги `en`, `ru`, `kk` |

Оглавление разделов задаётся в [src/lib/docs/registry.ts](../src/lib/docs/registry.ts).

## Файлы в этом каталоге (`docs/`)

Раньше здесь лежали длинные `.md`. **Актуальные тексты** поддерживаются в **`content/docs/{locale}/`**. Ниже — ссылки на юридические и общие файлы в корне репозитория.

| Тема | Файл |
|------|------|
| Лицензия | [LICENSE](../LICENSE), [NOTICE](../NOTICE) |
| Участие | [CONTRIBUTING.md](../CONTRIBUTING.md), [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) |
| Безопасность | [SECURITY.md](../SECURITY.md) |
| История версий | [CHANGELOG.md](../CHANGELOG.md) |
| Сторонние лицензии | [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) |

## Прочее

| Документ | Примечание |
|----------|------------|
| [DEVELOPMENT.md](DEVELOPMENT.md) | Краткий указатель; полный текст — `/docs/…/development` |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Краткий указатель; полный текст — `/docs/…/architecture` |
| [DISTRIBUTION.md](DISTRIBUTION.md) | Краткий указатель; полный текст — `/docs/…/distribution` |
| [PERFORMANCE.md](PERFORMANCE.md) | Краткий указатель; полный текст — `/docs/…/performance` |
| [OPEN_SOURCE.md](OPEN_SOURCE.md) | Краткий указатель; полный текст — `/docs/…/open-source` |

## Шаблоны GitHub

В каталоге [`.github/`](../.github/): шаблон Pull Request и issue templates.
