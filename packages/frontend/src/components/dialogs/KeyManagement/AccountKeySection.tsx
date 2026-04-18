import React, { useCallback, useEffect, useState } from 'react'

import useTranslationFunction from '../../../hooks/useTranslationFunction'
import useConfirmationDialog from '../../../hooks/dialog/useConfirmationDialog'
import { selectedAccountId } from '../../../ScreenController'
import {
  getAccountKeyInfo,
  importSelfSecretKey,
} from '../../../backend/key-management'
import type { AccountKeyInfo } from '../../../backend/key-management'
import { runtime } from '@deltachat-desktop/runtime-interface'
import { unknownErrorToString } from '@deltachat-desktop/shared/unknownErrorToString'
import { LastUsedSlot, rememberLastUsedPath } from '../../../utils/lastUsedPaths'
import type { RuntimeOpenDialogOptions } from '@deltachat-desktop/shared/shared-types'
import { dirname } from 'path'

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

    // Step 3: Final confirmation with file path
    const finalConfirmed = await openConfirmationDialog({
      header: tx('key_management_import_confirm_header'),
      message: tx('key_management_import_confirm_body', filename),
      confirmLabel: tx('key_management_import_confirm_action'),
      cancelLabel: tx('cancel'),
      isConfirmDanger: true,
    })
    if (!finalConfirmed) return

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
