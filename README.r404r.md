# deltachat-desktop — r404r fork

Experimental fork of [`deltachat/deltachat-desktop`](https://github.com/deltachat/deltachat-desktop)
maintained by [@r404r](https://github.com/r404r). For the upstream project and
official releases, see the main [`README.md`](./README.md).

---

## Branch strategy — three-line parallel model

The fork needs to do three different things that must not contaminate each
other:

1. **Stay in sync with upstream** (absorb their bug fixes and features)
2. **Contribute back to upstream** (send them PRs from clean bases)
3. **Carry fork-only features** that upstream won't or can't accept

Mixing all of these into one branch produces the classic fork-rot where
upstream PRs leak fork-private code, `git merge deltachat/main` hits
spurious conflicts, and nobody can tell which commits are "ours" anymore.

We avoid that with three long-lived lines plus short-lived worker branches:

```
deltachat/deltachat-desktop/main ─────●──────●──────●───→   (upstream, read-only for us)
                                       \      \      \
                                        \      \      \     fetch + ff-only merge
                                         ↓      ↓      ↓
origin/main ──────────────────────────●─●──────●──────●───→  (pristine upstream mirror)
                                       ↑
                                       └── short-lived fix/* or feat/* PR branches
                                           cut from here, pushed to open PRs
                                           against deltachat/deltachat-desktop

                                                   rebase r404r-main onto main
                                                   to absorb upstream updates
                                                         ↓
origin/r404r-main ──●──●──●──●──●──●──●──●──●──●──●──●──→   (fork integration / default)
                          ↑                    ↑
                          │                    └── short-lived r404r/* sub-feature
                          │                        branches cut from r404r-main,
                          │                        merged back with --no-ff
                          └── this is what GitHub shows to visitors and what
                              end users download builds from
```

### Role of each line

| Line | Purpose | Accepted inputs | Push policy |
|---|---|---|---|
| `deltachat/deltachat-desktop/main` (remote) | Source of truth for upstream project. | (nothing — read-only from our side) | (n/a) |
| [`origin/main`](../../tree/main) | Pristine mirror of upstream. Used as the base for outgoing PRs so upstream sees a clean diff. | Only fast-forward merges from `deltachat/deltachat-desktop/main`. Never rebase, never force-push, never merge `r404r-main` into it. | `git merge --ff-only` + plain `git push`. |
| [`origin/r404r-main`](../../tree/r404r-main) | Integration branch for all fork-specific work. Default branch of this repo. Build artifacts are cut from here. | (a) rebases onto `main` to absorb upstream updates; (b) `--no-ff` merges from `r404r/*` sub-feature branches. | `git rebase main` + `git push --force-with-lease`. |
| `r404r/*` (short-lived) | One per fork-only feature or bugfix. Keeps big changes isolated while in progress. | Normal commits. | Normal push; delete after merging to `r404r-main`. |
| `fix/*`, `feat/*` (short-lived) | One per PR going to upstream. | Normal commits. | Push to `origin`, open PR with base `deltachat/deltachat-desktop:main`. Delete after merge. |

### Why this works

- **Upstream merges never conflict with fork features.** Fork features only
  live on `r404r-main`. When upstream lands work that touches the same
  files, the conflict surfaces during `git rebase main` on `r404r-main` —
  and we resolve it once, in isolation, away from any PR submission.
- **Upstream PRs stay clean.** Because `fix/*` / `feat/*` branches start
  from `main` (which is byte-identical to upstream), diffs contain only the
  intended change. Upstream maintainers see no fork contamination.
- **End users get the enhanced version by default.** GitHub's default
  branch is `r404r-main`, so fresh clones and web-UI visitors land on the
  fork with all its features and its README prominent.
- **`main` is a free tool.** Anyone (including upstream maintainers) can
  `diff main deltachat/deltachat-desktop/main` and get an empty result,
  which is the strongest proof that the fork isn't secretly shipping
  hidden code on the upstream-mirror branch.

See [**Fork management workflow**](#fork-management-workflow) below for the
exact commands used to keep these invariants true.

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
