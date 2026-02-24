import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const code = searchParams.get('code') || ''
  const state = searchParams.get('state') || ''
  const error = searchParams.get('error') || ''
  const errorDescription =
    searchParams.get('error_description') ||
    searchParams.get('error') ||
    ''

  // ✅ 앱으로 되돌릴 딥링크 (provider=google 명시)
  const base = `myapp://oauth?provider=google`

  // ❌ 에러로 돌아온 경우
  if (error) {
    const deepLink =
      `${base}` +
      `&error=${encodeURIComponent(error)}` +
      `&error_description=${encodeURIComponent(errorDescription)}` +
      `&state=${encodeURIComponent(state)}`

    return NextResponse.redirect(deepLink)
  }

  // ❌ code 없는 경우 (비정상 접근)
  if (!code) {
    const deepLink =
      `${base}` +
      `&error=missing_code` +
      `&state=${encodeURIComponent(state)}`
    return NextResponse.redirect(deepLink)
  }

  // ✅ 정상 로그인
  const deepLink =
    `${base}` +
    `&code=${encodeURIComponent(code)}` +
    `&state=${encodeURIComponent(state)}`

  return NextResponse.redirect(deepLink)
}
