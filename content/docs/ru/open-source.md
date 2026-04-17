# Open source: чеклист мейнтейнера

Помогает выпускать Tanym как зрелый open source продукт: лицензии, метаданные, релизная дисциплина.

**Ведущий мейнтейнер:** Kuralbek Adilet — [kuralbekadilet475@gmail.com](mailto:kuralbekadilet475@gmail.com).

## Стек лицензий

| Артефакт | Лицензия |
|----------|----------|
| Исходники приложения | [Apache-2.0](https://github.com/qrlbk/Tanym/blob/main/LICENSE) |
| Зависимости | [THIRD_PARTY_NOTICES](https://github.com/qrlbk/Tanym/blob/main/THIRD_PARTY_NOTICES.md) |

Apache-2.0 — разрешительная лицензия: коммерческое использование, модификация, распространение при соблюдении условий и NOTICE.

## Перед первым публичным push

- [ ] Заполнить **repository / homepage / bugs** в `package.json`.
- [ ] Включить **GitHub Security**: приватные отчёты, Dependabot, secret scanning.
- [ ] **Защита ветки** по умолчанию при росте команды.
- [ ] Заменить placeholder URL в `tauri.conf.json` (updater и т.д.) или оставить выкл.
- [ ] Убедиться, что в `.env.example` **нет секретов**, описаны dev-переменные.

## Релизы

1. Обновить `CHANGELOG.md`, semver.
2. Тег `v0.x.y`.
3. Выложить артефакты **Tauri** в Releases с checksum и заметками о подписи — см. [Дистрибуция](/docs/ru/distribution).

## Товарный знак

Apache-2.0 **не** даёт прав на имя или лого проекта. При публикации бинарников уточните политику товарного знака.

## Сообщество

- [CODE_OF_CONDUCT.md](https://github.com/qrlbk/Tanym/blob/main/CODE_OF_CONDUCT.md)
- [CONTRIBUTING.md](https://github.com/qrlbk/Tanym/blob/main/CONTRIBUTING.md)
