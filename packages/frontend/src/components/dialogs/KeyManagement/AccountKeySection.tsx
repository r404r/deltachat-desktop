import React, { useCallback, useEffect, useState } from 'react'

import useTranslationFunction from '../../../hooks/useTranslationFunction'
import useConfirmationDialog from '../../../hooks/dialog/useConfirmationDialog'
import useDialog from '../../../hooks/dialog/useDialog'
import { selectedAccountId } from '../../../ScreenController'
import { BackendRemote } from '../../../backend-com'
import {
  exportSelfSecretKey,
  getAccountKeyInfo,
  importSelfSecretKey,
} from '../../../backend/key-management'
import type { AccountKeyInfo } from '../../../backend/key-management'
import AlertDialog from '../AlertDialog'
import ConfirmationDialog from '../ConfirmationDialog'
import CannotReplaceKeyDialog from './CannotReplaceKeyDialog'
import { runtime } from '@deltachat-desktop/runtime-interface'
import { unknownErrorToString } from '@deltachat-desktop/shared/unknownErrorToString'
import { LastUsedSlot, rememberLastUsedPath } from '../../../utils/lastUsedPaths'
import type { RuntimeOpenDialogOptions } from '@deltachat-desktop/shared/shared-types'
import type { DcEventType } from '@deltachat/jsonrpc-client'
import { basename, dirname } from 'path'

export default function AccountKeySection() {
  const tx = useTranslationFunction()
  const [keyInfo, setKeyInfo] = useState<AccountKeyInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    getAccountKeyInfo(selectedAccountId())
      .then(setKeyInfo)
      .catch(err => setError(unknownErrorToString(err)))
  }, [reloadKey])

  const copyFingerprint = async () => {
    if (!keyInfo?.fingerprint) return
    await runtime.writeClipboardText(keyInfo.fingerprint)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const refreshKeyInfo = () => setReloadKey(n => n + 1)

  return (
    <div>
      <h4>{tx('key_management_my_keys')}</h4>
      {error ? (
        <p style={{ color: 'var(--colorDanger)' }}>
          {tx('error_x', error)}
        </p>
      ) : !keyInfo ? (
        <p style={{ color: 'var(--textSecondary)' }}>{tx('loading')}</p>
      ) : (
        <div>
          {keyInfo.address && (
            <p
              style={{
                fontSize: '13px',
                color: 'var(--textSecondary)',
                marginBottom: '8px',
              }}
            >
              {keyInfo.address}
            </p>
          )}
          {keyInfo.fingerprint ? (
            <div
              style={{
                padding: '8px 12px',
                border: '1px solid var(--borderColor)',
                borderRadius: '4px',
                marginBottom: '8px',
                fontFamily: 'monospace',
                fontSize: '13px',
                wordBreak: 'break-all',
              }}
            >
              {keyInfo.fingerprint}
            </div>
          ) : (
            <p style={{ color: 'var(--textSecondary)' }}>
              {tx('key_management_no_fingerprint')}
            </p>
          )}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {keyInfo.fingerprint && (
              <button
                type='button'
                onClick={copyFingerprint}
                style={{
                  padding: '4px 12px',
                  cursor: 'pointer',
                  border: '1px solid var(--borderColor)',
                  borderRadius: '4px',
                  background: 'var(--bgPrimary)',
                  color: 'var(--textPrimary)',
                }}
              >
                {copied
                  ? tx('copied_to_clipboard')
                  : tx('key_management_copy_fingerprint')}
              </button>
            )}
            <ImportKeyButton onImported={refreshKeyInfo} />
            <ExportKeyButton />
          </div>
        </div>
      )}
    </div>
  )
}

function ImportKeyButton({ onImported }: { onImported: () => void }) {
  const tx = useTranslationFunction()
  const openConfirmationDialog = useConfirmationDialog()
  const { openDialog } = useDialog()
  const [importing, setImporting] = useState(false)

  const handleImport = useCallback(async () => {
    // Preflight: core v2.49.0 does not allow replacing an existing key
    // (see PR chatmail/core#6574). If the account already has a key,
    // show a dialog explaining why and offering to add a new account —
    // the only path where import works end-to-end. Skipping this check
    // would bubble the raw SQL error
    // `UNIQUE constraint failed: config.keyname` up to the user.
    let existingInfo: AccountKeyInfo | null = null
    try {
      existingInfo = await getAccountKeyInfo(selectedAccountId())
    } catch {
      // If the preflight fetch fails we fall through to the normal
      // flow; core will raise a clearer error if something is really
      // wrong with the account.
    }
    if (existingInfo?.fingerprint) {
      openDialog(CannotReplaceKeyDialog, {
        currentFingerprint: existingInfo.fingerprint,
        onAddAccount: async () => {
          await window.__addAndSelectAccount()
        },
      })
      return
    }

    // Step 1: Risk acknowledgement
    const acknowledged = await openConfirmationDialog({
      header: tx('key_management_import_warning_header'),
      message: tx('key_management_import_warning_body'),
      confirmLabel: tx('key_management_import_warning_continue'),
      cancelLabel: tx('cancel'),
      isConfirmDanger: true,
    })
    if (!acknowledged) return

    // Step 2: File picker
    const { defaultPath, setLastPath } = await rememberLastUsedPath(
      LastUsedSlot.KeyImport
    )
    const opts: RuntimeOpenDialogOptions = {
      title: tx('key_management_import_key'),
      defaultPath,
      properties: ['openFile'],
      filters: [{ extensions: ['asc'], name: 'PGP Key' }],
    }
    const [filename] = await runtime.showOpenFileDialog(opts)
    if (!filename) return
    setLastPath(dirname(filename))

    // In browser builds, showOpenFileDialog uploads the picked file into a
    // backend temp path. Since this file contains PRIVATE KEY material, we
    // must delete it on every exit path.
    const isBrowser = runtime.getRuntimeInfo().target === 'browser'
    const cleanupTempFile = async () => {
      if (isBrowser) {
        try {
          await runtime.removeTempFile(filename)
        } catch {
          // best-effort cleanup; nothing actionable on failure
        }
      }
    }

    // Step 3: Final confirmation with file path
    const finalConfirmed = await openConfirmationDialog({
      header: tx('key_management_import_confirm_header'),
      message: tx('key_management_import_confirm_body', filename),
      confirmLabel: tx('key_management_import_confirm_action'),
      cancelLabel: tx('cancel'),
      isConfirmDanger: true,
    })
    if (!finalConfirmed) {
      await cleanupTempFile()
      return
    }

    // Step 4: Execute
    setImporting(true)
    try {
      const result = await importSelfSecretKey(selectedAccountId(), filename)
      if (result.success) {
        window.__userFeedback({
          type: 'success',
          text: tx('key_management_import_success'),
        })
        onImported()
      } else {
        window.__userFeedback({
          type: 'error',
          text: tx('error_x', result.error ?? 'unknown error'),
        })
      }
    } finally {
      setImporting(false)
      await cleanupTempFile()
    }
  }, [openConfirmationDialog, openDialog, onImported, tx])

  return (
    <button
      type='button'
      onClick={handleImport}
      disabled={importing}
      title={tx('key_management_import_desc')}
      style={{
        padding: '4px 12px',
        cursor: importing ? 'wait' : 'pointer',
        border: '1px solid var(--borderColor)',
        borderRadius: '4px',
        background: 'var(--bgPrimary)',
        color: 'var(--textPrimary)',
      }}
    >
      {importing
        ? tx('loading')
        : tx('key_management_import_key')}
    </button>
  )
}

function ExportKeyButton() {
  const tx = useTranslationFunction()
  const openConfirmationDialog = useConfirmationDialog()
  const { openDialog } = useDialog()
  const [exporting, setExporting] = useState(false)

  const handleExport = useCallback(async () => {
    // Step 1: Risk acknowledgement — exported keys are unencrypted and
    // cannot be revoked.
    const acknowledged = await openConfirmationDialog({
      header: tx('key_management_export_warning_header'),
      message: tx('key_management_export_warning_body'),
      confirmLabel: tx('key_management_export_warning_continue'),
      cancelLabel: tx('cancel'),
      isConfirmDanger: true,
    })
    if (!acknowledged) return

    // Step 2: Choose destination (directory) or use browser placeholder.
    const isBrowser = runtime.getRuntimeInfo().target === 'browser'
    let destination: string
    if (isBrowser) {
      destination = '<BROWSER>'
    } else {
      const { defaultPath, setLastPath } = await rememberLastUsedPath(
        LastUsedSlot.KeyExport
      )
      const opts: RuntimeOpenDialogOptions = {
        title: tx('key_management_export_key'),
        defaultPath,
        properties: ['openDirectory', 'createDirectory'],
        buttonLabel: tx('select'),
      }
      const [chosen] = await runtime.showOpenFileDialog(opts)
      if (!chosen) return
      setLastPath(chosen)
      destination = chosen
    }

    // Step 3: Final confirmation showing target location.
    const finalConfirmed = await openConfirmationDialog({
      header: tx('key_management_export_confirm_header'),
      message: tx(
        'key_management_export_confirm_body',
        isBrowser ? tx('key_management_export_browser_note') : destination
      ),
      confirmLabel: tx('key_management_export_confirm_action'),
      cancelLabel: tx('cancel'),
      isConfirmDanger: true,
    })
    if (!finalConfirmed) return

    // Step 4: Execute. Collect every `ImexFileWritten` event into a buffer
    // while the RPC runs — do NOT surface anything to the user yet. If the
    // export fails mid-way we want to show the error, not a partial set of
    // download links that look successful.
    const accountId = selectedAccountId()
    const writtenPaths: string[] = []
    const onFileWritten = ({ path }: DcEventType<'ImexFileWritten'>) => {
      writtenPaths.push(path)
    }
    const emitter = BackendRemote.getContextEvents(accountId)
    emitter.on('ImexFileWritten', onFileWritten)

    setExporting(true)
    try {
      const result = await exportSelfSecretKey(accountId, destination)

      // In browser mode, ImexFileWritten events can arrive after the RPC
      // resolves because they're delivered through the event stream. A
      // short grace window catches late events without stalling the UI.
      // Backup.tsx uses 1s for a single file; we use 3s because
      // export_self_keys writes multiple files and unsubscribing too
      // early would silently drop files.
      if (isBrowser) {
        await new Promise(res => setTimeout(res, 3000))
      }

      // Failure path.
      if (!result.success) {
        window.__userFeedback({
          type: 'error',
          text: tx('error_x', result.error ?? 'unknown error'),
        })

        // Browser special case: if any `ImexFileWritten` events fired
        // before the failure, those .asc files are still on the server
        // inside DC_ACCOUNTS_DIR/backups. The `/download-backup/:file`
        // route is what deletes them (10s after the download completes),
        // and there is no other cleanup endpoint. Offer each link as an
        // explicit confirm/cancel prompt.
        //
        // IMPORTANT: `window.open(...)` must run SYNCHRONOUSLY from the
        // dialog's click callback so the browser's popup blocker keeps
        // the user-activation token. If we `await openConfirmationDialog`
        // and call `window.open` afterwards, Safari/strict Chromium drop
        // user activation and block the popup. So open the dialog
        // directly and pass an inline `cb` that fires `window.open`.
        // Dismissal (Escape / backdrop) invokes the cb with `false`,
        // which leaves the file in place — the safe default for secret
        // key material.
        if (isBrowser && writtenPaths.length > 0) {
          for (const path of writtenPaths) {
            const downloadLink = `/download-backup/${basename(path)}`
            await new Promise<void>(resolveDialog => {
              openDialog(ConfirmationDialog, {
                header: tx('key_management_export_partial_header'),
                message: tx(
                  'key_management_export_partial_browser_file',
                  downloadLink
                ),
                confirmLabel: tx('download'),
                cancelLabel: tx('cancel'),
                cb: (yes: boolean) => {
                  if (yes) {
                    window.open(downloadLink, '__blank')
                  }
                  resolveDialog()
                },
              })
            })
            // Declined: file stays on server until manual cleanup or
            // next `/download-backup` hit. We can't do better without a
            // dedicated delete endpoint (separate cross-package change).
          }
        }
        return
      }

      // Step 5: Success feedback — only now expose anything to the user.
      if (!isBrowser) {
        window.__userFeedback({
          type: 'success',
          text: tx('key_management_export_success_electron', destination),
        })
        return
      }

      if (writtenPaths.length === 0) {
        // Browser succeeded but we observed no file events in the grace
        // window; surface a hint so the user doesn't think it silently
        // failed.
        window.__userFeedback({
          type: 'success',
          text: tx('key_management_export_success_browser_empty'),
        })
        return
      }

      // Browser success: open one AlertDialog per file with a clickable
      // OK button that triggers `window.open(/download-backup/...)`.
      // Mirrors Backup.tsx's single-file flow but fanned out per file
      // because export_self_keys writes private + public halves.
      for (const path of writtenPaths) {
        const downloadLink = `/download-backup/${basename(path)}`
        openDialog(AlertDialog, {
          cb: () => window.open(downloadLink, '__blank'),
          message: tx(
            'key_management_export_success_browser_file',
            downloadLink
          ),
          okBtnLabel: tx('open'),
        })
      }
    } finally {
      emitter.off('ImexFileWritten', onFileWritten)
      setExporting(false)
    }
  }, [openConfirmationDialog, openDialog, tx])

  return (
    <button
      type='button'
      onClick={handleExport}
      disabled={exporting}
      title={tx('key_management_export_desc')}
      style={{
        padding: '4px 12px',
        cursor: exporting ? 'wait' : 'pointer',
        border: '1px solid var(--borderColor)',
        borderRadius: '4px',
        background: 'var(--bgPrimary)',
        color: 'var(--textPrimary)',
      }}
    >
      {exporting ? tx('loading') : tx('key_management_export_key')}
    </button>
  )
}
