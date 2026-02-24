import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const code = searchParams.get('code') || ''
  const state = searchParams.get('state') || ''
  const error = searchParams.get('error') || ''
  const errorDescription = searchParams.get('error_description') || ''

  // ❌ 카카오에서 에러로 돌아온 경우도 앱으로 전달
  if (error) {
    const deepLink =
      `myapp://oauth?error=${encodeURIComponent(error)}` +
      `&error_description=${encodeURIComponent(errorDescription)}` +
      `&state=${encodeURIComponent(state)}`

    return NextResponse.redirect(deepLink)
  }

  // ✅ 정상 로그인
  const deepLink =
    `myapp://oauth?code=${encodeURIComponent(code)}` +
    `&state=${encodeURIComponent(state)}`

  return NextResponse.redirect(deepLink)
}
