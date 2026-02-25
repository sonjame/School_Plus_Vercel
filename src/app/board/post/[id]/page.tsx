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

  // 🔥 대표 이미지 우선순위
  let ogImage: string | undefined = post.thumbnail

  // 1️⃣ 대표 썸네일이 없으면 유튜브 썸네일 확인
  if (!ogImage && Array.isArray(post.attachments)) {
    const youtube = post.attachments.find((a: any) => a.type === 'video')

    if (youtube?.url) {
      const videoId = youtube.url.includes('youtu.be')
        ? youtube.url.split('youtu.be/')[1]
        : youtube.url.split('v=')[1]?.split('&')[0]

      if (videoId) {
        ogImage = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  }

  // 2️⃣ 그래도 없으면 첫 번째 이미지
  if (!ogImage && Array.isArray(post.images) && post.images.length > 0) {
    ogImage = post.images[0]
  }

  // 3️⃣ 전부 없으면 기본 이미지
  if (!ogImage) {
    ogImage = `${process.env.NEXT_PUBLIC_SITE_URL}/board/post/${id}/opengraph-image`
  }

  return {
    title: post.title,
    description: '', // 🔥 설명 제거 (사진만 강조)
    openGraph: {
      title: '', // 🔥 제목도 제거하면 거의 이미지 카드처럼 보임
      description: '',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
        },
      ],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image', // 🔥 트위터용 큰 이미지 카드
      images: [ogImage],
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
