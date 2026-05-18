import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const KAKAO_TOKEN_ENDPOINT =
  'https://kauth.kakao.com/oauth/token'

const KAKAO_REDIRECT_URI =
  'https://school-plus-vercel.vercel.app/api/auth/kakao_mobile/callback'

const APP_OAUTH_REDIRECT_URI =
  'myapp://oAuth/kakaooauth'

function redirectToApp(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString()

  return NextResponse.redirect(
    `${APP_OAUTH_REDIRECT_URI}?${query}`,
  )
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const code = searchParams.get('code') || ''
  const state = searchParams.get('state') || ''
  const error = searchParams.get('error') || ''
  const errorDescription =
    searchParams.get('error_description') || ''

  if (error) {
    return redirectToApp({
      provider: 'kakao',
      error,
      error_description: errorDescription,
      state,
    })
  }

  if (!code) {
    return redirectToApp({
      provider: 'kakao',
      error: 'missing_code',
      state,
    })
  }

  const clientId =
    process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY?.trim()

  const clientSecret =
    process.env.EXPO_PUBLIC_KAKAO_CLIENT_SECRET?.trim()

  if (!clientId) {
    return redirectToApp({
      provider: 'kakao',
      error: 'missing_kakao_client_id',
      state,
    })
  }

  if (!clientSecret) {
    return redirectToApp({
      provider: 'kakao',
      error: 'missing_kakao_client_secret',
      state,
    })
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

    const tokenData = await tokenRes
      .json()
      .catch(() => ({}))

    if (!tokenRes.ok || !tokenData?.access_token) {
      return redirectToApp({
        provider: 'kakao',
        error:
          tokenData?.error_description ||
          tokenData?.error ||
          'token_exchange_failed',
        state,
      })
    }

    return redirectToApp({
      provider: 'kakao',
      verified: '1',
      access_token: String(tokenData.access_token),
      state,
    })
  } catch {
    return redirectToApp({
      provider: 'kakao',
      error: 'server_token_exchange_failed',
      state,
    })
  }
}
