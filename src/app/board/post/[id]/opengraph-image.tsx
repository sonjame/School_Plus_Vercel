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

  let youtubeThumb: string | null = null

  if (Array.isArray(post.attachments)) {
    const youtube = post.attachments.find((a: any) => a.type === 'video')

    if (youtube?.url) {
      const videoId = youtube.url.includes('youtu.be')
        ? youtube.url.split('youtu.be/')[1]
        : youtube.url.split('v=')[1]?.split('&')[0]

      if (videoId) {
        youtubeThumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  }

  // 🔥 유튜브가 있으면 중앙 배치
  if (youtubeThumb) {
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'black',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={youtubeThumb}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain', // 🔥 핵심: 잘림 방지
          }}
        />
      </div>,
      size,
    )
  }

  // 🔥 기본 제목 카드
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #4FC3F7, #0288D1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 80,
        color: 'white',
        textAlign: 'center',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          maxWidth: 1000,
        }}
      >
        {post.title}
      </div>
    </div>,
    size,
  )
}
