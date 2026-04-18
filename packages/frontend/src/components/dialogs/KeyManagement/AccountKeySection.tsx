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
  const [importing, setImporting] = useState(false)

  const handleImport = useCallback(async () => {
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
  }, [openConfirmationDialog, onImported, tx])

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

    // Step 4: Execute, collecting any files core writes along the way.
    const accountId = selectedAccountId()
    const writtenFiles: string[] = []
    const onFileWritten = ({ path }: DcEventType<'ImexFileWritten'>) => {
      writtenFiles.push(path)
    }
    const emitter = BackendRemote.getContextEvents(accountId)
    emitter.on('ImexFileWritten', onFileWritten)

    setExporting(true)
    try {
      const result = await exportSelfSecretKey(accountId, destination)

      // In browser mode, events can arrive slightly after the RPC returns
      // (see Backup.tsx for the same workaround).
      if (isBrowser) {
        await new Promise(res => setTimeout(res, 1000))
      }

      if (!result.success) {
        window.__userFeedback({
          type: 'error',
          text: tx('error_x', result.error ?? 'unknown error'),
        })
        return
      }

      // Step 5: Success feedback.
      if (isBrowser) {
        // Each written file can be downloaded through the backup route.
        if (writtenFiles.length === 0) {
          window.__userFeedback({
            type: 'success',
            text: tx('key_management_export_success_browser_empty'),
          })
        } else {
          const links = writtenFiles
            .map(p => `/download-backup/${basename(p)}`)
            .join('\n')
          openDialog(AlertDialog, {
            message: tx('key_management_export_success_browser', links),
          })
        }
      } else {
        window.__userFeedback({
          type: 'success',
          text: tx('key_management_export_success_electron', destination),
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
