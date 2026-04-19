import React from 'react'

import Dialog, {
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  FooterActions,
} from '../../Dialog'
import FooterActionButton from '../../Dialog/FooterActionButton'
import useTranslationFunction from '../../../hooks/useTranslationFunction'

import type { DialogProps } from '../../../contexts/DialogContext'

/**
 * Shown when the user tries to import a PGP key onto an account that
 * already has a key.
 *
 * Core (as of v2.49.0) intentionally rejects this via a UNIQUE constraint
 * on `config.keyname` — see
 * https://github.com/chatmail/core/pull/6574
 * "fix: make it impossible to overwrite default key". Replacing a key
 * breaks verified groups the account is already part of, and there is no
 * key-rotation protocol in Autocrypt/SecureJoin.
 *
 * The only official way to use a custom key is to import it onto a
 * brand-new, not-yet-configured account, before core generates its own.
 * This dialog explains that and offers to add a new account.
 */
export type Props = {
  currentFingerprint: string
  onAddAccount: () => void | Promise<void>
} & DialogProps

export default function CannotReplaceKeyDialog({
  currentFingerprint,
  onAddAccount,
  onClose,
}: Props) {
  const tx = useTranslationFunction()

  const handleAddAccount = async () => {
    onClose()
    try {
      await onAddAccount()
    } catch {
      // caller surfaces failures; nothing to do here
    }
  }

  return (
    <Dialog onClose={onClose}>
      <DialogHeader
        title={tx('key_management_cannot_replace_header')}
        onClose={onClose}
      />
      <DialogBody>
        <DialogContent>
          <p className='whitespace'>
            {tx('key_management_cannot_replace_body')}
          </p>
          {currentFingerprint && (
            <>
              <p
                style={{
                  marginTop: '12px',
                  fontSize: '13px',
                  color: 'var(--textSecondary)',
                }}
              >
                {tx('key_management_cannot_replace_current')}
              </p>
              <div
                style={{
                  padding: '8px 12px',
                  marginTop: '4px',
                  border: '1px solid var(--borderColor)',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  wordBreak: 'break-all',
                }}
              >
                {currentFingerprint}
              </div>
            </>
          )}
        </DialogContent>
      </DialogBody>
      <DialogFooter>
        <FooterActions>
          <FooterActionButton onClick={onClose}>
            {tx('close')}
          </FooterActionButton>
          <FooterActionButton styling='primary' onClick={handleAddAccount}>
            {tx('key_management_cannot_replace_add_account')}
          </FooterActionButton>
        </FooterActions>
      </DialogFooter>
    </Dialog>
  )
}
