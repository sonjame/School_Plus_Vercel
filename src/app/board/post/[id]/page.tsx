// app/board/post/[id]/page.tsx

import { Suspense } from 'react'
import PostDetailClient from './PostDetailClient'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/posts/${id}`,
    { cache: 'no-store' },
  )

  if (!res.ok) {
    return { title: '게시글' }
  }

  const post = await res.json()

  const hasImage = Array.isArray(post.images) && post.images.length > 0

  const plainText = post.content?.replace(/<[^>]+>/g, '').slice(0, 120) ?? ''

  return {
    title: post.title,
    description: plainText,
    openGraph: {
      title: post.title,
      description: plainText,
      images: hasImage
        ? [{ url: post.images[0] }]
        : [
            {
              url: `${process.env.NEXT_PUBLIC_SITE_URL}/board/post/${id}/opengraph-image`,
            },
          ],
      type: 'article',
    },
  }
}

export default function Page() {
  return (
    <Suspense
      fallback={<div style={{ padding: 20 }}>게시글 불러오는 중...</div>}
    >
      <PostDetailClient />
    </Suspense>
  )
}
