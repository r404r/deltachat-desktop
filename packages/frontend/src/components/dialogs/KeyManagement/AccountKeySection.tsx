import React, { useEffect, useState } from 'react'

import useTranslationFunction from '../../../hooks/useTranslationFunction'
import { selectedAccountId } from '../../../ScreenController'
import { getAccountKeyInfo } from '../../../backend/key-management'
import type { AccountKeyInfo } from '../../../backend/key-management'
import { runtime } from '@deltachat-desktop/runtime-interface'
import { unknownErrorToString } from '@deltachat-desktop/shared/unknownErrorToString'

export default function AccountKeySection() {
  const tx = useTranslationFunction()
  const [keyInfo, setKeyInfo] = useState<AccountKeyInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getAccountKeyInfo(selectedAccountId())
      .then(setKeyInfo)
      .catch(err => setError(unknownErrorToString(err)))
  }, [])

  const copyFingerprint = async () => {
    if (!keyInfo?.fingerprint) return
    await runtime.writeClipboardText(keyInfo.fingerprint)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
          {keyInfo.fingerprint && (
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
            <ImportKeyButton />
          </div>
          {keyInfo.encryptionInfo && (
            <details style={{ marginTop: '12px' }}>
              <summary style={{ cursor: 'pointer', color: 'var(--textSecondary)' }}>
                {tx('encryption_info_title_desktop')}
              </summary>
              <p
                style={{
                  whiteSpace: 'pre-wrap',
                  fontSize: '13px',
                  marginTop: '8px',
                }}
              >
                {keyInfo.encryptionInfo}
              </p>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

function ImportKeyButton() {
  const tx = useTranslationFunction()

  // Core does not yet provide import_self_secret_key RPC.
  // Button is disabled until that endpoint is available.
  const coreSupportsImport = false

  return (
    <button
      type='button'
      disabled
      title={tx('key_management_import_desc')}
      style={{
        padding: '4px 12px',
        cursor: coreSupportsImport ? 'pointer' : 'not-allowed',
        border: '1px solid var(--borderColor)',
        borderRadius: '4px',
        background: 'var(--bgPrimary)',
        color: 'var(--textPrimary)',
        opacity: 0.4,
      }}
    >
      {tx('key_management_import_key')}
    </button>
  )
}
