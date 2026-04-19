# deltachat-desktop — r404r fork

Experimental fork of [`deltachat/deltachat-desktop`](https://github.com/deltachat/deltachat-desktop)
maintained by [@r404r](https://github.com/r404r). For the upstream project and
official releases, see the main [`README.md`](./README.md).

---

## Branch layout

This fork uses two long-lived branches with very different purposes:

| Branch | Purpose | Contents |
|---|---|---|
| [`main`](../../tree/main) | Pristine mirror of upstream `deltachat/deltachat-desktop/main`. Used exclusively as the base for upstream-bound PRs. | 100% upstream, no fork additions. |
| [`r404r-main`](../../tree/r404r-main) | Default branch of this fork. Upstream + fork-specific features. Consumed by downstream users of the fork. | Upstream + key management UI + docs in `docs-fix/`. |

Short-lived PR branches are cut off `main` and named `fix/*`, `feat/*`, etc.
Fork-only feature branches are cut off `r404r-main` and named `r404r/*`.

## Features added by this fork

All fork-specific features are **experimental** and gated behind feature flags
in Settings → Advanced → Experimental Features.

### Key Management UI

| Capability | Status | Spec |
|---|---|---|
| Feature flag `enableKeyManagement` | shipped | [`docs-fix/01-feature-flag.md`](./docs-fix/01-feature-flag.md) |
| Account key info display (fingerprint, email, copy button) | shipped | [`docs-fix/04-account-key-info.md`](./docs-fix/04-account-key-info.md) |
| Contact key list (lazy-loaded) + detail view | shipped | [`docs-fix/05-contact-key-info.md`](./docs-fix/05-contact-key-info.md) |
| Import self key (with preflight warning dialog) | shipped | [`docs-fix/08-enable-import-key.md`](./docs-fix/08-enable-import-key.md), [`docs-fix/11-import-key-preflight.md`](./docs-fix/11-import-key-preflight.md) |
| Export self key (multi-step warnings, browser download fan-out) | shipped | [`docs-fix/10-export-self-key.md`](./docs-fix/10-export-self-key.md) |
| Pin / unpin contact key | UI scaffolded, disabled (awaits core support) | [`docs-fix/06-pin-unpin-ui.md`](./docs-fix/06-pin-unpin-ui.md) |

See [`docs-fix/00-overview.md`](./docs-fix/00-overview.md) for the cross-task
index and [`docs-fix/codex-proposal-review.md`](./docs-fix/codex-proposal-review.md)
for the original design review.

## Known divergences from upstream

We intentionally re-enable functionality that upstream has removed:

- **Import self key** — removed in upstream
  [PR #4784](https://github.com/deltachat/deltachat-desktop/pull/4784) (2025-03-18).
  Rationale + constraints in
  [`docs-fix/08-import-key-research.md`](./docs-fix/08-import-key-research.md).
- **Export self key** — removed in upstream PR #5801 (2025-12-05). Re-enabled
  with multi-step warnings; see
  [`docs-fix/10-export-self-key.md`](./docs-fix/10-export-self-key.md).

Both features are protected by strong in-UI warnings about the underlying
Autocrypt/SecureJoin constraints (no key rotation protocol, unencrypted
export, etc.).

## Building locally

### macOS (Electron + Tauri, ad-hoc signed)

We have no Apple Developer certificate for the fork, so macOS builds use
**ad-hoc signing**. This requires a custom entitlements file and a specific
re-sign workflow — covered in detail in
[`docs-fix/09-tauri-macos-adhoc-build.md`](./docs-fix/09-tauri-macos-adhoc-build.md).

Quick reference for Electron DMG:

```bash
# Ensure a clean pnpm state
pnpm -w run reset:node_modules

# Build production frontend + main process bundles
cd packages/target-electron
VERSION_INFO_GIT_REF="v2.49.1-dev" pnpm build4production

# Regenerate electron-builder config and flatten deps
pnpm pack:generate_config
pnpm pack:patch-node-modules

# Build the unsigned arm64 DMG
CSC_IDENTITY_AUTO_DISCOVERY=false pnpm exec electron-builder \
  --config ./electron-builder.json5 --mac dmg \
  -c.mac.provisioningProfile= -c.mac.identity=null -c.afterSign=./stub.cjs

# Output: packages/target-electron/dist/DeltaChat-<version>-arm64.dmg
```

For Tauri use the full recipe in `docs-fix/09-tauri-macos-adhoc-build.md`
(four gotchas documented there, including a stale-bundle trap that caused us
real pain).

## Fork management workflow

### Sync upstream into `main`

```bash
git fetch deltachat/deltachat-desktop
git checkout main
git merge --ff-only deltachat/deltachat-desktop/main
git push origin main
```

`--ff-only` guarantees `main` stays a pure mirror — if upstream rebased or
force-pushed something exotic, the command fails loudly instead of silently
producing a merge commit.

### Pull upstream changes into `r404r-main`

```bash
git checkout r404r-main
git rebase main
# resolve any conflicts, then:
git push origin r404r-main --force-with-lease
```

We use `rebase` (not `merge`) so `r404r-main` stays linear and readable as
"upstream + a few patches on top".

### Submit a PR to upstream

```bash
git checkout main
git pull --ff-only
git checkout -b fix/clear-bug-title
# ... make the minimal fix, commit ...
git push origin fix/clear-bug-title
# Open PR on GitHub with base = deltachat/deltachat-desktop main,
#                    compare = r404r/fix/clear-bug-title
```

The fix typically flows back into `r404r-main` automatically the next time
we sync upstream and rebase.

### Add a fork-only feature

```bash
git checkout r404r-main
git checkout -b r404r/dark-mode-polish
# ... work, commit ...
git checkout r404r-main
git merge --no-ff r404r/dark-mode-polish
git branch -d r404r/dark-mode-polish
git push origin r404r-main
```

## Release tagging

Fork-specific releases use a `r404r-` prefix so they never collide with
upstream tags:

```bash
git checkout r404r-main
git tag r404r-v2.49.1-keymgmt
git push origin r404r-v2.49.1-keymgmt
```
