import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const code = searchParams.get('code') || ''
  const state = searchParams.get('state') || ''
  const error = searchParams.get('error') || ''
  const errorDescription = searchParams.get('error_description') || ''

  // 🔥 변경된 경로
  const base = `myapp://oAuth/kakaooauth`

  // ❌ 에러로 돌아온 경우
  if (error) {
    const deepLink =
      `${base}?error=${encodeURIComponent(error)}` +
      `&error_description=${encodeURIComponent(errorDescription)}` +
      `&state=${encodeURIComponent(state)}`

    return NextResponse.redirect(deepLink)
  }

  // ❌ code 없는 경우
  if (!code) {
    const deepLink =
      `${base}?error=missing_code` +
      `&state=${encodeURIComponent(state)}`
    return NextResponse.redirect(deepLink)
  }

  // ✅ 정상 로그인
  const deepLink =
    `${base}?code=${encodeURIComponent(code)}` +
    `&state=${encodeURIComponent(state)}`

  return NextResponse.redirect(deepLink)
}
