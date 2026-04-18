import React, { useState } from 'react'

import Dialog, {
  DialogBody,
  DialogContent,
} from '../../Dialog'
import DialogHeader from '../../Dialog/DialogHeader'
import useTranslationFunction from '../../../hooks/useTranslationFunction'

import type { DialogProps } from '../../../contexts/DialogContext'
import AccountKeySection from './AccountKeySection'
import ContactKeyList from './ContactKeyList'
import ContactKeyDetail from './ContactKeyDetail'

type View =
  | { type: 'main' }
  | { type: 'contact_list' }
  | { type: 'contact_detail'; contactId: number }

export default function KeyManagementDialog({ onClose }: DialogProps) {
  const tx = useTranslationFunction()
  const [view, setView] = useState<View>({ type: 'main' })

  const goBack = () => {
    if (view.type === 'contact_detail') {
      setView({ type: 'contact_list' })
    } else if (view.type === 'contact_list') {
      setView({ type: 'main' })
    }
  }

  const title =
    view.type === 'main'
      ? tx('key_management')
      : view.type === 'contact_list'
        ? tx('key_management_contact_keys')
        : tx('encryption_info_title_desktop')

  return (
    <Dialog onClose={onClose} width={500}>
      <DialogHeader
        title={title}
        onClose={onClose}
        onClickBack={view.type !== 'main' ? goBack : undefined}
      />
      <DialogBody>
        <DialogContent>
          {view.type === 'main' && (
            <MainView
              onViewContactKeys={() => setView({ type: 'contact_list' })}
            />
          )}
          {view.type === 'contact_list' && (
            <ContactKeyList
              onSelectContact={contactId =>
                setView({ type: 'contact_detail', contactId })
              }
            />
          )}
          {view.type === 'contact_detail' && (
            <ContactKeyDetail contactId={view.contactId} />
          )}
        </DialogContent>
      </DialogBody>
    </Dialog>
  )
}

function MainView({
  onViewContactKeys,
}: {
  onViewContactKeys: () => void
}) {
  const tx = useTranslationFunction()

  return (
    <>
      <AccountKeySection />
      <div style={{ marginTop: '16px' }}>
        <h4>{tx('key_management_contact_keys')}</h4>
        <button
          type='button'
          onClick={onViewContactKeys}
          style={{
            width: '100%',
            padding: '8px 12px',
            cursor: 'pointer',
            textAlign: 'left',
            border: '1px solid var(--borderColor)',
            borderRadius: '4px',
            background: 'var(--bgPrimary)',
            color: 'var(--textPrimary)',
          }}
        >
          {tx('key_management_view_contact_keys')} &rarr;
        </button>
      </div>
    </>
  )
}
