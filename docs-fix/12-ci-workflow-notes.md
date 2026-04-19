# CI / GitHub Actions workflow notes (for the r404r fork)

Upstream `deltachat/deltachat-desktop` ships 9 workflows. When the repo is
forked, GitHub Actions re-enables all of them on the fork by default, even
if upstream had disabled them through the web UI.

This document is the running inventory of what each workflow does, whether
it works on this fork out of the box, and what to do about the ones that
don't. The fork also adds **one** of its own workflow file
(`r404r-release.yml`, only on `r404r-main`).

## Summary table

| Workflow file | Triggers | Works on fork? | Action |
|---|---|---|---|
| `test.yml` | push everywhere | ❌ **broken** — runs `pnpm run build` at root; no such script | **Disable via UI** (see "test.yml" below) |
| `e2e.yml` | push main, PR | ❌ missing secrets / vars | **Disable via UI** (see "e2e.yml" below) |
| `build-preview.yml` | PR | ⚠️ runs 3× matrix (mac/linux/win) per PR; upload step gated | Consider disabling if you don't use `#public-preview` |
| `delete-preview.yml` | PR closed | ⚠️ needs SSH secrets to `download.delta.chat` | Only runs with `#public-preview` in PR body; likely leave as-is |
| `basic-tests.yml` | push main, PR | ✅ | — |
| `build-tauri-preview.yml` | PR on `packages/target-tauri/**` | ✅ | — |
| `build-tauri-release.yml` | push tag `v*` | ✅ but produces only Linux+Windows artifacts (no Release object) | Triggers on upstream-style tags; ignore unless you also want loose artifacts. |
| `build-windows-appx.yml` | push any tag | ✅ | Note: also fires on `r404r-v*` tags. Consider disabling if you don't ship to Windows Store. |
| `rust-tauri-lint.yml` | PR on `packages/target-tauri/**` | ✅ | — |
| `r404r-release.yml` (fork-only, `r404r-main`) | push tag `r404r-v*` | ✅ — built specifically for this fork | See "Fork release workflow" below. |

"Works on fork" means: runs to green without manual GitHub repo configuration
(secrets / variables / enabling / disabling).

---

## Must-disable workflows

### `test.yml` — broken at HEAD

**Symptom.** Every push to `main` or `r404r-main` triggers two runs
("Tests (ubuntu-latest)" + "Tests (windows-latest)") that both fail in the
`build` step:

```
ERR_PNPM_NO_SCRIPT  Missing script: build
Command "build" not found.
Error: Process completed with exit code 1.
```

**Root cause.** The workflow runs `pnpm run build` at the repo root
(`test.yml:31`). The root `package.json` has `build:electron`,
`build:browser`, etc., but no plain `build`. The bug was introduced during
the monorepo restructure in upstream commit `a5c024339` (2024-09-10,
Simon Laux). Every `packages/*/package.json` DOES have a `build` script,
but the workflow doesn't `cd` into one of them first.

**Upstream's fix.** They disabled the workflow through the GitHub web UI
(shows as `state=disabled_manually` when you query
`/repos/deltachat/deltachat-desktop/actions/workflows` via the REST API).
The `.yml` file is still committed to the repo, but GitHub itself is told
not to dispatch runs for it.

**Fork implication.** When a fork is created, GitHub Actions re-enables
every workflow on the fork. So on r404r's fork the broken workflow runs
again, producing the failures you see.

**Remediation.** Match upstream — disable via web UI:

1. Open https://github.com/r404r/deltachat-desktop/actions/workflows/test.yml
2. Top-right `···` menu → **Disable workflow**

This keeps the file in sync with upstream (no `main`-branch drift) while
stopping the broken runs.

**Why not fix the file?** Two reasons:

1. On `main` we want zero drift from upstream so `git diff main
   deltachat/deltachat-desktop/main` stays empty (see `README.r404r.md`
   "Why this works" section).
2. Fixing only on `r404r-main` wouldn't help: the workflow re-runs on every
   push to `main` as well.

### `e2e.yml` — missing CI mail-server credentials

**Symptom.** Runs on push to `main` and on every PR. Fails because the
workflow needs three repo-level configuration values that only upstream
has:

```yaml
env:
  DC_CHATMAIL_DOMAIN:    ${{ vars.DC_CHATMAIL_DOMAIN }}
  DC_MAIL_SERVER:        ${{ vars.CI_MAIL_SERVER }}
  DC_MAIL_SERVER_TOKEN:  ${{ secrets.CI_MAIL_SERVER_TOKEN }}
```

The `CI_MAIL_SERVER_TOKEN` secret in particular hands out access to a Delta
Chat project-run mail server, and upstream is not going to share it with a
fork.

**Remediation.** Disable via web UI:
https://github.com/r404r/deltachat-desktop/actions/workflows/e2e.yml →
`···` → **Disable workflow**.

**Alternatives** (not recommended):

- Run e2e locally before each push, since `pnpm e2e` works on a dev machine.
- Provision your own chatmail server and add the three settings to the
  fork's GitHub repo settings → Secrets and variables → Actions. Too much
  work for no clear gain.

---

## Workflows to consider disabling

### `build-preview.yml` — 3× matrix on every PR

**What it does.** On every PR to the fork (that's not docs/README-only),
spawns three jobs (`ubuntu-latest`, `macos-latest`, `windows-latest`) that
each run a full `electron-builder` package step. That's expensive (~15
minutes each × 3 platforms × every PR commit).

**Upload behavior.** The external upload to `download.delta.chat` only
happens if the PR body contains `#public-preview` or the title contains
`prepare release`. Otherwise the resulting artifacts are just attached to
the GitHub run.

**Fork impact.** Artifacts work on the fork, but the 3× build matrix eats
CI minutes on every PR. For a small fork with no need for cross-platform
preview builds on every branch, this is overkill.

**Decision.** Leave enabled **only** if you need preview artifacts in PRs.
Otherwise disable via web UI and rebuild locally per
`docs-fix/09-tauri-macos-adhoc-build.md` (macOS) or the corresponding
commands for Linux/Windows.

### `delete-preview.yml` — cleanup of `download.delta.chat`

**What it does.** On PR close, overwrites preview files on
`download.delta.chat` with empty placeholders.

**Fork impact.** Gated by `#public-preview` in the PR body, so it only
actually runs if someone opens such a PR. If they do, the SSH upload
requires `secrets.USERNAME` + `secrets.KEY` which the fork doesn't have.

**Decision.** Leave enabled if `build-preview.yml` is enabled (they're
paired). Disable otherwise.

---

## Workflows that just work

- **`basic-tests.yml`** runs `pnpm check` + `pnpm -w test`. Both scripts
  exist. This is the real "CI" for the fork.
- **`build-tauri-preview.yml`** and **`rust-tauri-lint.yml`** are path-
  filtered to `packages/target-tauri/**`, use only the auto-provisioned
  `GITHUB_TOKEN`, and work on any fork.
- **`build-tauri-release.yml`** fires on `push tag v*`. ⚠️ It produces only
  Linux + Windows Tauri artifacts and does NOT create a GitHub Release —
  artifacts land in the per-run Actions sidebar. For fork releases use the
  fork-only workflow below instead.
- **`build-windows-appx.yml`** fires on **any** tag (`tags: '*'`), so it
  also matches `r404r-v*`. Produces an Electron `.appx` artifact for the
  Windows Store. The fork has no Microsoft Store presence; consider
  disabling unless you have a reason to keep these artifacts around.

---

## Fork release workflow

`r404r-release.yml` (lives only on `r404r-main`) is the fork's
purpose-built release pipeline. Triggered by `r404r-v*` tag pushes.

**Build matrix (5 jobs in parallel):**

| Job | Runner | Output |
|---|---|---|
| `electron-mac` | `macos-latest` (arm64) | `DeltaChat-<ver>-arm64.dmg` |
| `electron-linux` | `ubuntu-22.04` | `DeltaChat-<ver>.AppImage` |
| `tauri-mac` | `macos-latest` (arm64) | `deltachat-tauri_<ver>_aarch64.dmg` |
| `tauri-linux` | `ubuntu-22.04` | `.deb` + `.rpm` + `.AppImage` |
| `tauri-windows` | `windows-latest` | `.msi` + `.exe` (NSIS) |

**Final job (`release`):**

1. Downloads every build job's artifacts.
2. Detects whether this is a stable or prerelease tag (stable iff the tag
   matches `r404r-vMAJOR.MINOR.PATCH$` exactly; everything else is
   prerelease).
3. Generates a changelog by walking `git log <previous r404r-v*
   tag>..<this tag>` (or, if this is the first such tag, walks back 50
   commits).
4. Notes the upstream merge-base commit so consumers can tell which
   upstream baseline this fork build sits on.
5. Calls `softprops/action-gh-release@v2` to create the Release with all
   artifacts attached.

**macOS specifics:**

- Both Electron and Tauri are ad-hoc signed (no Apple Developer cert).
- Electron uses `-c.mac.identity=null -c.afterSign=./stub.cjs`.
- Tauri uses `APPLE_SIGNING_IDENTITY=-`, then **re-signs the .app** with
  `bundle_resources/Entitlements.dev.plist`, then **rebuilds the DMG**
  via `bundle_dmg.sh` from the re-signed bundle. Necessary because
  Tauri's bundled DMG was created with the merlinux-team-id production
  entitlements which Gatekeeper rejects under ad-hoc signing.
- See [`docs-fix/09-tauri-macos-adhoc-build.md`](./09-tauri-macos-adhoc-build.md)
  for the full background and gotchas.

**Why this lives only on `r404r-main`:**

- Tag-triggered workflows execute the workflow file as it exists in the
  commit the tag points to. Since `r404r-v*` tags are always created on
  `r404r-main`, the workflow only needs to live there.
- Keeping it off `main` preserves the zero-drift invariant
  (`git diff main deltachat/deltachat-desktop/main` stays empty).

**Why we don't auto-publish from upstream's `build-tauri-release.yml`:**

- It only covers Linux + Windows Tauri (no macOS, no Electron).
- It uploads to Actions artifacts, not Releases — would still need a
  follow-up step to assemble a Release.
- Modifying it on `main` would break the upstream-mirror invariant.

---

## Operational checklist for future fork syncs

After `git merge --ff-only deltachat/deltachat-desktop/main` into `main`:

1. Note any new `.github/workflows/*.yml` files upstream added.
2. For each new workflow, check:
   - Does it reference `secrets.*` or `vars.*`?
   - Does it push to an upstream-owned domain (`download.delta.chat`, mail
     servers, etc.)?
   - Does its default trigger run on fork pushes/PRs?
3. Re-read the summary table at the top of this doc and add/update the row.
4. Disable any workflow that's broken on the fork (match upstream) via the
   GitHub web UI. Do NOT delete or rewrite the `.yml` file on `main` —
   that would break the "zero drift from upstream" invariant.
5. If a workflow fix only makes sense on `r404r-main`, add it there with a
   `# fork-override` comment and document it in this file.
