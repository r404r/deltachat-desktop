import React, { useEffect, useState } from 'react'

import useTranslationFunction from '../../../hooks/useTranslationFunction'
import { selectedAccountId } from '../../../ScreenController'
import { BackendRemote } from '../../../backend-com'
import { unknownErrorToString } from '@deltachat-desktop/shared/unknownErrorToString'
import type { T } from '@deltachat/jsonrpc-client'
import { InlineVerifiedIcon } from '../../VerifiedIcon'

type Props = {
  onSelectContact: (contactId: number) => void
}

export default function ContactKeyList({ onSelectContact }: Props) {
  const tx = useTranslationFunction()
  const [contacts, setContacts] = useState<T.Contact[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const accountId = selectedAccountId()
    BackendRemote.rpc
      .getContacts(accountId, 0, null)
      .then(setContacts)
      .catch(err => setError(unknownErrorToString(err)))
  }, [])

  if (error) {
    return <p style={{ color: 'var(--colorDanger)' }}>{tx('error_x', error)}</p>
  }

  if (!contacts) {
    return <p style={{ color: 'var(--textSecondary)' }}>{tx('loading')}</p>
  }

  if (contacts.length === 0) {
    return (
      <p style={{ color: 'var(--textSecondary)' }}>
        {tx('key_management_no_contacts')}
      </p>
    )
  }

  return (
    <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {contacts.map(contact => (
        <li key={contact.id}>
          <button
            type='button'
            onClick={() => onSelectContact(contact.id)}
            style={{
              width: '100%',
              padding: '10px 12px',
              cursor: 'pointer',
              textAlign: 'left',
              border: 'none',
              borderBottom: '1px solid var(--borderColor)',
              background: 'transparent',
              color: 'var(--textPrimary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{ fontSize: '16px' }}
              title={
                contact.e2eeAvail
                  ? tx('messages_are_e2ee')
                  : undefined
              }
            >
              {contact.e2eeAvail ? '\u{1F512}' : '\u{1F513}'}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 500 }}>
                {contact.displayName}
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: '12px',
                  color: 'var(--textSecondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {contact.address}
              </span>
            </span>
            {contact.isVerified && <InlineVerifiedIcon />}
          </button>
        </li>
      ))}
    </ol>
  )
}
