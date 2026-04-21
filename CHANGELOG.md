# История изменений

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/).

## [Unreleased]

### Изменено

- Лицензия исходного кода репозитория: **Apache License 2.0** (вместо проприетарной
  «все права защищены»). Обновлены `LICENSE`, `NOTICE`, `package.json`, `Cargo.toml`,
  README и уведомления о сторонних компонентах.

### Добавлено

- `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1).
- `docs/OPEN_SOURCE.md` — чеклист для публикации open source.
- `docs/ARCHITECTURE.md` — обзор подсистем и потоков данных.
- Шаблоны GitHub: `.github/pull_request_template.md`, issue templates для багов и фич.
- Автоматический релизный workflow `.github/workflows/release.yml`: по тегу `vX.Y.Z` собирает
  установщики для Windows/macOS/Linux и публикует их в GitHub Releases.
- Правило релиза: версия тега должна совпадать с `package.json` и
  `src-tauri/tauri.conf.json`, иначе публикация останавливается с ошибкой.

### Добавлено (ранее в этой ветке)

- Документация: `CONTRIBUTING.md`, `SECURITY.md`, `THIRD_PARTY_NOTICES.md`, каталог `docs/`.

---

Ранее версии не фиксировались в этом файле; при необходимости дополняйте разделами
`[0.1.0]`, `[0.2.0]` и т.д. с датами по мере релизов.
