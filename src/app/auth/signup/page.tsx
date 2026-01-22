import { Suspense } from 'react'
import SignupClient from './SignupClient'

export default function SignupPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <SignupClient />
    </Suspense>
  )
}
