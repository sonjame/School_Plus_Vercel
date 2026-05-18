import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const KAKAO_TOKEN_ENDPOINT =
  'https://kauth.kakao.com/oauth/token'

// ✅ 서버에서는 redirect_uri를 하드코딩
const KAKAO_REDIRECT_URI =
  'https://school-plus-vercel.vercel.app/api/auth/kakao_mobile/callback'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const code = searchParams.get('code') || ''
  const state = searchParams.get('state') || ''
  const error = searchParams.get('error') || ''
  const errorDescription =
    searchParams.get('error_description') || ''

  if (error) {
    return NextResponse.redirect(
      `myapp://oauth?error=${encodeURIComponent(error)}` +
        `&error_description=${encodeURIComponent(errorDescription)}` +
        `&state=${encodeURIComponent(state)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `myapp://oauth?error=missing_code` +
        `&state=${encodeURIComponent(state)}`
    )
  }

  // ✅ 요청한 환경변수명으로 고정
  const clientId =
    process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY?.trim()

  const clientSecret =
    process.env.EXPO_PUBLIC_KAKAO_CLIENT_SECRET?.trim()

  if (!clientId) {
    return NextResponse.redirect(
      `myapp://oauth?error=missing_kakao_client_id` +
        `&state=${encodeURIComponent(state)}`
    )
  }

  if (!clientSecret) {
    return NextResponse.redirect(
      `myapp://oauth?error=missing_kakao_client_secret` +
        `&state=${encodeURIComponent(state)}`
    )
  }

  try {
    const tokenRes = await fetch(KAKAO_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: KAKAO_REDIRECT_URI,
        code,
      }).toString(),
    })

    const tokenData =
      await tokenRes.json().catch(() => ({}))

    if (!tokenRes.ok || !tokenData?.access_token) {
      const message =
        tokenData?.error_description ||
        tokenData?.error ||
        'token_exchange_failed'

      return NextResponse.redirect(
        `myapp://oauth?error=${encodeURIComponent(message)}` +
          `&state=${encodeURIComponent(state)}`
      )
    }

    return NextResponse.redirect(
      `myapp://oauth?provider=kakao` +
        `&access_token=${encodeURIComponent(tokenData.access_token)}` +
        `&state=${encodeURIComponent(state)}`
    )
  } catch {
    return NextResponse.redirect(
      `myapp://oauth?error=server_token_exchange_failed` +
        `&state=${encodeURIComponent(state)}`
    )
  }
}
