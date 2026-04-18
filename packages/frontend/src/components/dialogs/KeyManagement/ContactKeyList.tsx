import React from 'react'

import useTranslationFunction from '../../../hooks/useTranslationFunction'

type Props = {
  onSelectContact: (contactId: number) => void
}

export default function ContactKeyList({ onSelectContact: _ }: Props) {
  const tx = useTranslationFunction()

  return (
    <div>
      <p style={{ color: 'var(--textSecondary)' }}>
        {tx('loading')}
      </p>
    </div>
  )
}
