import React from 'react'

import useTranslationFunction from '../../../hooks/useTranslationFunction'

type Props = {
  contactId: number
}

export default function ContactKeyDetail({ contactId: _ }: Props) {
  const tx = useTranslationFunction()

  return (
    <div>
      <p style={{ color: 'var(--textSecondary)' }}>
        {tx('loading')}
      </p>
    </div>
  )
}
