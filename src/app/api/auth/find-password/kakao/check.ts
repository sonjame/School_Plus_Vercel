// /api/auth/find-password/kakao/check
import { NextResponse } from 'next/server'
import db from '@/src/lib/db'

export async function POST(req: Request) {
  const { username } = await req.json()

  const [rows]: any = await db.query(
    `
    SELECT id
    FROM users
    WHERE username = ?
      AND provider = 'kakao'
    `,
    [username],
  )

  if (rows.length === 0) {
    return NextResponse.json(
      { message: '카카오 계정이 아닙니다.' },
      { status: 404 },
    )
  }

  const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize
    ?client_id=${process.env.KAKAO_CLIENT_ID}
    &redirect_uri=${process.env.KAKAO_REDIRECT_URI}
    &response_type=code
    &state=find-password:${username}`

  return NextResponse.json({ kakaoAuthUrl })
}
