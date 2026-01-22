// src/app/board/[category]/page.tsx
import { Suspense } from 'react'
import CategoryClient from './CategoryClient'

export default function CategoryPage() {
  return (
    <Suspense
      fallback={<div style={{ padding: 20 }}>게시판 불러오는 중...</div>}
    >
      <CategoryClient />
    </Suspense>
  )
}
