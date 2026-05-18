import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const KAKAO_TOKEN_ENDPOINT = 'https://kauth.kakao.com/oauth/token'

const KAKAO_REDIRECT_URI =
  'https://school-plus-vercel.vercel.app/api/auth/kakao_mobile/callback'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const code = searchParams.get('code') || ''
  const state = searchParams.get('state') || ''
  const error = searchParams.get('error') || ''
  const errorDescription = searchParams.get('error_description') || ''

  if (error) {
    const deepLink =
      `myapp://oauth?error=${encodeURIComponent(error)}` +
      `&error_description=${encodeURIComponent(errorDescription)}` +
      `&state=${encodeURIComponent(state)}`

    return NextResponse.redirect(deepLink)
  }

  if (!code) {
    return NextResponse.redirect(
      `myapp://oauth?error=missing_code&state=${encodeURIComponent(state)}`
    )
  }

  const clientId =
    process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY!

  const clientSecret =
    process.env.EXPO_PUBLIC_KAKAO_CLIENT_SECRET!

  try {
    const tokenRes = await fetch(KAKAO_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: KAKAO_REDIRECT_URI,
        code,
      }).toString(),
    })

    const tokenData = await tokenRes.json().catch(() => ({}))

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

    const deepLink =
      `myapp://oauth?provider=kakao` +
      `&access_token=${encodeURIComponent(tokenData.access_token)}` +
      `&state=${encodeURIComponent(state)}`

    return NextResponse.redirect(deepLink)
  } catch (err) {
    return NextResponse.redirect(
      `myapp://oauth?error=server_token_exchange_failed` +
        `&state=${encodeURIComponent(state)}`
    )
  }
}
