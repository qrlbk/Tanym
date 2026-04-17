# Open source: maintainer checklist

This page helps **maintainers** ship Tanym as a credible open-source product:
licensing, metadata, and release hygiene.

## License stack

| Artifact | License |
|----------|---------|
| Application source in this repo | [Apache-2.0](../LICENSE) |
| Bundled dependencies | See [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) and per-package metadata |

Apache-2.0 is permissive: commercial use, modification, and distribution are
allowed under the license terms, including the patent grant and NOTICE
requirements for redistributions.

## Before the first public push

- [ ] Set **repository URL** in `package.json` (`repository`, optional `homepage`, `bugs`) when the canonical Git host is known.
- [ ] Enable **GitHub Security** features: private vulnerability reporting,
  Dependabot (or equivalent), secret scanning.
- [ ] Add **branch protection** on the default branch: required CI, review for
  merges if the team is multi-person.
- [ ] Replace placeholder URLs in `src-tauri/tauri.conf.json` (e.g. updater
  endpoint, homepage) or keep them disabled until infrastructure exists.
- [ ] Confirm `.env.example` contains **no real secrets** and documents every
  variable the app reads in development.

## Releases

1. Update [CHANGELOG.md](../CHANGELOG.md) with a dated section and semver tag.
2. Tag the repository (`v0.x.y`) from the commit you ship.
3. Attach **Tauri** build artifacts to GitHub Releases (or your store pipeline)
   with checksums and signing notes per [DISTRIBUTION.md](DISTRIBUTION.md).

## Trademark note

The **Apache-2.0 license does not grant trademark rights** to the project name
or logo. If you publish binaries, clarify trademark usage on the website or in
the README (e.g. “Tanym” is a mark of …).

## Community

- [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) — expected behavior.
- [CONTRIBUTING.md](../CONTRIBUTING.md) — how to contribute code and docs.
