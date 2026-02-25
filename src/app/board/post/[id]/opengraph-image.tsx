// app/board/post/[id]/opengraph-image.tsx

import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/posts/${id}`,
    { cache: 'no-store' },
  )

  if (!res.ok) {
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#4FC3F7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 60,
          color: 'white',
        }}
      >
        게시글
      </div>,
      size,
    )
  }

  const post = await res.json()

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #4FC3F7, #0288D1)',
        display: 'flex',
        flexDirection: 'column', // 🔥 핵심 추가
        alignItems: 'center',
        justifyContent: 'center',
        padding: 80,
        color: 'white',
        textAlign: 'center',
        fontFamily: 'sans-serif',
      }}
    >
      {/* 제목 */}
      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          lineHeight: 1.2,
          maxWidth: 1000,
          wordBreak: 'break-word',
        }}
      >
        {post.title}
      </div>
    </div>,
    size,
  )
}
