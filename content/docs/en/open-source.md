# Open source: maintainer checklist

This page helps **maintainers** ship Tanym as a credible open-source product: licensing, metadata, and release hygiene.

**Primary maintainer:** Kuralbek Adilet — [kuralbekadilet475@gmail.com](mailto:kuralbekadilet475@gmail.com).

## License stack

| Artifact | License |
|----------|---------|
| Application source | [Apache-2.0](https://github.com/qrlbk/Tanym/blob/main/LICENSE) |
| Bundled dependencies | [THIRD_PARTY_NOTICES](https://github.com/qrlbk/Tanym/blob/main/THIRD_PARTY_NOTICES.md) |

Apache-2.0 is permissive: commercial use, modification, and distribution are allowed under its terms, including the patent grant and NOTICE requirements.

## Before the first public push

- [ ] Set **repository URL** in `package.json` (`repository`, `homepage`, `bugs`) when the host is known.
- [ ] Enable **GitHub Security**: private vulnerability reporting, Dependabot, secret scanning.
- [ ] **Branch protection** on default branch if the team grows.
- [ ] Replace placeholder URLs in `src-tauri/tauri.conf.json` (updater, etc.) or keep disabled.
- [ ] Confirm `.env.example` has **no real secrets** and documents dev variables.

## Releases

1. Update `CHANGELOG.md` with a dated section and semver.
2. Tag the repo (`v0.x.y`).
3. Attach **Tauri** build artifacts to GitHub Releases with checksums and signing notes per [Distribution](/docs/en/distribution).

## Trademark

Apache-2.0 does **not** grant trademark rights to the project name or logo. Clarify trademark usage on the website or README if you ship binaries.

## Community

- [CODE_OF_CONDUCT.md](https://github.com/qrlbk/Tanym/blob/main/CODE_OF_CONDUCT.md)
- [CONTRIBUTING.md](https://github.com/qrlbk/Tanym/blob/main/CONTRIBUTING.md)
