import React from 'react'

import useTranslationFunction from '../../../hooks/useTranslationFunction'

export default function AccountKeySection() {
  const tx = useTranslationFunction()

  return (
    <div>
      <h4>{tx('key_management_my_keys')}</h4>
      <p style={{ color: 'var(--textSecondary)' }}>
        {tx('loading')}
      </p>
    </div>
  )
}
