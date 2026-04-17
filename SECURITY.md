# Security policy

## Supported versions

Security fixes are applied to the **default branch** and, when applicable,
backported to the latest **release** branch or tagged release the maintainers
support. Exact support windows are announced in release notes when they change.

## Reporting a vulnerability

**Please do not file public issues** for undisclosed security vulnerabilities.

Preferred options (use whichever the project has enabled):

1. **GitHub Security Advisories**  
   In the GitHub repository: **Security → Report a vulnerability**. This opens a
   private thread visible only to reporters and maintainers.

2. **Maintainer contact**  
   If GitHub private reporting is not available, write to the project author,
   **Kuralbek Adilet** — **kuralbekadilet475@gmail.com** (use a clear subject line,
   e.g. `[Tanym security]`), or use the process listed in the repository **About**
   section.

### What to include

- Short description of the issue and its impact.
- Steps to reproduce (or proof-of-concept) if safe to share.
- Affected component (Next.js route, Tauri command, dependency, etc.).
- Versions: app version or commit hash, OS, runtime (Node / browser / Tauri).

We aim to acknowledge reports within a few business days. Critical issues may
receive faster handling when possible.

## Dependency hygiene

The app depends on npm and Rust ecosystems. Periodically:

- Run `npm audit` and upgrade vulnerable dependencies per policy.
- Rebuild Tauri with an up-to-date Rust toolchain and review `cargo audit` (or
  equivalent) output for `src-tauri/`.

Security announcements from **Next.js**, **Tauri**, and major AI SDK vendors
should be monitored if you ship production builds.

## Scope

Reports should concern **this repository’s code and configuration**. For issues
in third-party libraries only, please also notify the upstream project according
to their security policy.
