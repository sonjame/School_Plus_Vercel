import { NextResponse } from 'next/server'
import { db } from '@/src/lib/db'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // 👈 중요

  if (!code) {
    return NextResponse.json({ error: 'No code received' }, { status: 400 })
  }

  // 1️⃣ 토큰 요청
  const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.KAKAO_REST_API_KEY || '',
      redirect_uri: process.env.KAKAO_REDIRECT_URI || '',
      code,
    }),
  })

  const tokenData = await tokenRes.json()

  if (!tokenData.access_token) {
    return NextResponse.json({ error: 'Failed to get token' }, { status: 500 })
  }

  // 2️⃣ 사용자 정보
  const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })

  const user = await userRes.json()

  const kakaoId = String(user.id)
  const email = user.kakao_account?.email || null
  const name = user.kakao_account?.profile?.nickname || '사용자'

  /* ===================================================
     ✅ 비밀번호 찾기 (카카오)
  =================================================== */
  if (state?.startsWith('find-password:')) {
    const username = state.split(':')[1]

    const [rows]: any = await db.query(
      `
      SELECT id
      FROM users
      WHERE username = ?
        AND provider = 'kakao'
        AND social_id = ?
      `,
      [username, kakaoId]
    )

    if (rows.length === 0) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/auth/find-password?error=not-match`
      )
    }

    // ✅ 인증 성공 → 비밀번호 재설정 페이지
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/auth/reset-password/kakao?username=${username}`
    )
  }

  /* ===================================================
     ✅ 아이디 찾기
  =================================================== */
  if (state === 'find-id') {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/auth/find-id/result?social_id=${kakaoId}`
    )
  }

  /* ===================================================
     ✅ 기존 회원가입 / 로그인 흐름 (유지)
  =================================================== */
  const baseUrl =
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : process.env.NEXT_PUBLIC_BASE_URL

  return NextResponse.redirect(
    `${baseUrl}/auth/signup` +
      `?verified=1` +
      `&provider=kakao` +
      `&social_id=${kakaoId}` +
      `&name=${encodeURIComponent(name)}` +
      `&email=${encodeURIComponent(email ?? '')}`
  )
}
