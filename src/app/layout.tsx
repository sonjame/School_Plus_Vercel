import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '스쿨 플러스 (School Plus)',
  description: '학생을 위한 학교 커뮤니티 플랫폼',
  verification: {
    google: 'NegZrvdc4HmzlqsjhSgXMqt9sWsRLPOWDvdGAHk2iKY', // ← content 값만
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
