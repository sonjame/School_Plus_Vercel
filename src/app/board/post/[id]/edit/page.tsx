// page.tsx
import { Suspense } from 'react'
import EditPostClient from './EditPostClient'

export default function Page() {
  return (
    <Suspense
      fallback={<div style={{ padding: 20 }}>게시글 불러오는 중...</div>}
    >
      <EditPostClient />
    </Suspense>
  )
}
