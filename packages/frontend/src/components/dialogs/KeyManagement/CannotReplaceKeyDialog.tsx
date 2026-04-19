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
  /**
   * Triggered when the user clicks "Add New Profile". This function is
   * responsible for:
   *   - creating + switching to the new account
   *   - tearing down any surrounding UI that still refers to the
   *     previous account (otherwise the caller's dialog will show
   *     stale data while its action handlers target the new account)
   *   - surfacing any error to the user (this dialog closes itself
   *     before invoking this callback and cannot report errors on its
   *     own)
   */
  onAddAccount: () => void | Promise<void>
} & DialogProps

export default function CannotReplaceKeyDialog({
  currentFingerprint,
  onAddAccount,
  onClose,
}: Props) {
  const tx = useTranslationFunction()

  const handleAddAccount = () => {
    // Close this explanatory dialog first so it doesn't linger during
    // the account switch. The caller is responsible for both the
    // account switch AND error reporting — see the prop JSDoc above.
    onClose()
    // Fire-and-forget: we deliberately don't await here because we
    // don't want to keep this unmounted component's render alive.
    // The caller handles success/error feedback.
    void onAddAccount()
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
