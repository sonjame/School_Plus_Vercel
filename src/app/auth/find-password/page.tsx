'use client'

import { Suspense } from 'react'
import FindPasswordClient from './FindPasswordClient'

export default function Page() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <FindPasswordClient />
    </Suspense>
  )
}
