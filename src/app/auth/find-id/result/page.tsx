'use client'

import { Suspense } from 'react'
import FindIdResultClient from './FindIdResultClient'

export default function Page() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <FindIdResultClient />
    </Suspense>
  )
}
