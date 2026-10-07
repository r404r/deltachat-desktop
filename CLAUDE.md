# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is this?

Delta Chat Desktop is an email-based encrypted messenger. The desktop app is built as a pnpm monorepo with multiple targets (Electron, Tauri WIP, Browser experimental). The frontend communicates with DeltaChat Core via JSONRPC over stdio.

## Commands

```bash
# Development
pnpm dev                          # Build + launch Electron in dev mode
pnpm -w watch:electron            # Watch mode (terminal 1)
pnpm -w start:electron            # Run built app (terminal 2)

# Code quality
pnpm -w check                     # Type check + lint + format check
pnpm -w check:types               # TypeScript only
pnpm -w check:lint                # ESLint only
pnpm -w check:format              # Prettier only
pnpm -w fix                       # Auto-fix lint + format
pnpm -w fix:lint                  # ESLint auto-fix
pnpm -w fix:format                # Prettier auto-fix

# Testing
pnpm -w test                      # Unit tests (Mocha + Chai)
pnpm -w test -- --grep "pattern"  # Run single test by name
pnpm -w e2e                       # E2E tests (Playwright, needs pnpm build:browser first)
pnpm -w e2e --ui                  # E2E with interactive UI

# Building
pnpm -w build:electron            # Build Electron target
pnpm -w build:browser             # Build browser target
```

Watch mode only hot-reloads frontend code. Main process changes require `pnpm -w build:electron` + restart.

## Architecture

**Monorepo packages** (`packages/`):

- `frontend/` - React 19 UI shared by all targets
- `runtime/` - Abstract runtime interface (`runtime.ts`) with per-target implementations
- `shared/` - Shared types and utilities
- `target-electron/` - Electron main process (primary target)
- `target-browser/` - Browser/web version
- `target-tauri/` - Tauri target (WIP)
- `e2e-tests/` - Playwright tests

**Frontend state management**: Custom `Store<S>` class (`packages/frontend/src/stores/store.ts`) with reducer pattern, effects, and `useStore` hook. No Redux/MobX.

**Backend communication**: `BackendRemote` singleton provides type-safe JSONRPC access to DeltaChat Core. Listen to backend events with `onDCEvent` hook.

**Runtime abstraction**: `@deltachat-desktop/runtime-interface` defines a platform-agnostic API. Each target implements it (e.g., `runtime-electron/runtime.ts`), allowing the frontend to run on Electron, Tauri, or Browser without changes.

**Translations**: `_locales/` directory. New/experimental strings go in `_locales/_untranslated_en.json`. Use `useTranslationFunction()` hook in components, `window.static_translate` in functions/dialogs.

## Conventions

- **Commit messages**: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `change:`, `refactor:`, `docs:`, etc.)
- **Code style**: Prettier (no semicolons, single quotes, trailing commas ES5) + ESLint. Match the style of surrounding code.
- **PRs**: One thing per PR. Avoid mixing refactors with features. Add screenshots for UI changes.
- **CI**: PRs require changelog entry (skip with `#skip-changelog` in description). Add `#public-preview` to PR description to publish preview builds.
- **SCSS**: See `docs/STYLES.md` for CSS conventions.
- **Feature docs**: Place design docs, specs, and task tracking for new features in `docs-fix/`.

## Fork maintenance (r404r)

This is a fork of `deltachat/deltachat-desktop`. Remotes: `origin` = `r404r/deltachat-desktop`,
`upstream` = `deltachat/deltachat-desktop` (fresh clones lack it — add with
`git remote add upstream https://github.com/deltachat/deltachat-desktop.git`). The fork carries an
experimental **key management** feature (PGP key import/export/view UI) gated behind
`desktopSettings.enableKeyManagement`.

### Key management surface (check after every upstream merge)

- `packages/frontend/src/components/dialogs/KeyManagement/` — dialog components
- `packages/frontend/src/backend/key-management.ts` — RPC adapter; most `BackendRemote.rpc.*`
  calls live here (`getChatSecurejoinQrCode`, `checkQr`, `getContactEncryptionInfo`,
  `exportSelfKeys`, …)
- `packages/frontend/src/utils/parseEncryptionInfo.ts` (+ `src/tests/parseEncryptionInfo.test.ts`) —
  parses the contact fingerprint out of `getContactEncryptionInfo` text
- `packages/frontend/src/components/Settings/Advanced.tsx` — gated entry point (`enableKeyManagement` check)
- `packages/frontend/src/components/Settings/ExperimentalFeatures.tsx` — toggle (`DesktopSettingsSwitch`)
- `packages/shared/shared-types.d.ts` + `packages/shared/state.ts` — flag type + default
- `_locales/_untranslated_en.json` — `key_management_*` strings

Verify after merging: gate chain intact, every `tx()` key used by these components exists,
`BackendRemote.rpc.*` methods still exist in the pinned `@deltachat/jsonrpc-client`, `T.Contact`
fields used still exist (core 2.62 dropped `isVerified`), and no duplicate keys in
`_untranslated_en.json`. Upstream regularly removes frontend helpers the fork uses — when one
disappears, adopt upstream's replacement (e.g. `window.__userFeedback` → `useAlertDialog`).

### Tauri target (fork-maintained)

Upstream moved Tauri to `deltachat/deltachat-tauri` (f839866f4, dormant since) and deleted it
here; the fork keeps it. Fork-owned pieces upstream will never touch again:

- `packages/target-tauri/` — `runtime-tauri/runtime.ts` must implement `packages/runtime/runtime.ts`
  and set every `DesktopSettingsType` / `RC_Config` key; `src-tauri/` links core as Rust crates
- Root `Cargo.toml` + `Cargo.lock` (cargo workspace), `bin/webxdc-check-permissions-policy-count.js`
- Tauri branches in `bin/build/update_desktop_version.js` and `bin/link_core/*`
- `.github/workflows/r404r-ci.yml` — `tauri-*` jobs: type check + JS build + `cargo check`/`cargo test`
  on every push/PR to `r404r-main`

Building `src-tauri` locally needs `libwebkit2gtk-4.1-dev libgtk-3-dev libsoup-3.0-dev
libayatana-appindicator3-dev librsvg2-dev`; without them rely on the CI workflow.

### Upstream merge checklist

1. `git branch backup/r404r-main-pre-merge-<ver>`, then `git fetch upstream && git merge upstream/main`
   into `r404r-main` — conflicts cluster in the key management surface above plus
   `pnpm-workspace.yaml`. Sync is by **merge**, never rebase/force-push (see `README.r404r.md`).
2. **Check `pnpm-workspace.yaml` for duplicate YAML keys** — git auto-merge has produced a
   duplicated `supportedArchitectures` block that breaks pnpm entirely (duplicated mapping key).
3. pnpm config lives in `pnpm-workspace.yaml`, NOT `.npmrc` (pnpm ≥11 ignores `.npmrc` for
   `shellEmulator`, `virtualStoreDirMaxLength`, etc.). `shellEmulator: true` is required or
   `NODE_ENV=production …` scripts break on the Windows CI runner.
4. Non-interactive `pnpm install` needs `CI=true` when pnpm wants to purge `node_modules`
   (e.g. after a pnpm major bump); a frozen-lockfile "overrides mismatch" error means local
   `overrides` diverged from the lockfile — prefer matching upstream over lockfile churn.
   Upstream's lockfile lacks the `packages/target-tauri` importer, so after merging run
   `pnpm install --no-frozen-lockfile` to re-add it.
5. **Tauri**:
   - Upstream no longer has `packages/target-tauri/`, so merges won't conflict there — breakage
     shows up as type errors instead. Run `pnpm --filter=@deltachat-desktop/target-tauri check:types`
     and port `packages/runtime` / `DesktopSettingsType` / `RC_Config` changes into
     `runtime-tauri/runtime.ts` (compare `runtime-electron/runtime.ts`).
   - If upstream bumped core (`catalog` `@deltachat/jsonrpc-client` in `pnpm-workspace.yaml`),
     bump the `deltachat` + `deltachat-jsonrpc` git tags in
     `packages/target-tauri/src-tauri/Cargo.toml` to match, then run
     `cargo update -p deltachat -p deltachat-jsonrpc` (core may also need e.g.
     `cargo update -p regex`). The JSONRPC API the Tauri backend serves must match what the
     frontend was built against.
   - `pnpm -w update:target-versions` — syncs tauri `package.json` + `Cargo.toml` version.
   - `pnpm --filter=@deltachat-desktop/target-tauri build` — catches moved `bin/` scripts
     (upstream renamed `bin/copy.js` → `bin/tools/copy.js`).
6. Run `pnpm -w check` and `pnpm -w test` (needs `pnpm -w translations:convert` once in a fresh
   checkout), and make sure `r404r CI` is green after pushing, before tagging.

### Release

Push an annotated tag matching `r404r-v*` to trigger `.github/workflows/r404r-release.yml`
(5 build jobs + GitHub Release). The workflow uses the tag name (`github.ref_name`) for
version info and artifact names; `package.json` version may stay at the upstream base
version — use a `-N` suffix (e.g. `r404r-v2.53.1-2`) for rebuilds of the same base.
Branch pushes to `r404r-main` only run `r404r-ci.yml` (plus upstream workflows that
match); release builds are tag-only.
