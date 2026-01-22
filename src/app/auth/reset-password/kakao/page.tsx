import { Suspense } from 'react'
import ResetPasswordKakaoClient from './ResetPasswordKakaoClient'

export default function Page() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <ResetPasswordKakaoClient />
    </Suspense>
  )
}
