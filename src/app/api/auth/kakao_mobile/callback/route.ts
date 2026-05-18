import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export const runtime = 'nodejs'

const KAKAO_AUTHORIZE_ENDPOINT =
  'https://kauth.kakao.com/oauth/authorize'

const KAKAO_TOKEN_ENDPOINT =
  'https://kauth.kakao.com/oauth/token'

const KAKAO_USER_ENDPOINT =
  'https://kapi.kakao.com/v2/user/me'

const KAKAO_REDIRECT_URI =
  'https://school-plus-vercel.vercel.app/api/auth/kakao_mobile/callback'

const APP_OAUTH_REDIRECT_URI =
  'myapp://oAuth/kakaooauth'

const PKCE_COOKIE_NAME = 'kakao_code_verifier'

function redirectToApp(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString()

  return NextResponse.redirect(
    `${APP_OAUTH_REDIRECT_URI}?${query}`,
  )
}

function pickStr(v: unknown) {
  return typeof v === 'string' ? v : ''
}

function base64Url(buffer: Buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function createCodeVerifier() {
  return base64Url(crypto.randomBytes(32))
}

function createCodeChallenge(codeVerifier: string) {
  return base64Url(
    crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest(),
  )
}

function makeState(loginMode: string) {
  const safeMode = loginMode.trim() || 'kakao:login'
  const nonce = base64Url(crypto.randomBytes(12))

  return `${safeMode}:${nonce}`
}

function actionFromState(state: string) {
  const parts = state.split(':')
  const provider = parts[0] || ''
  const action = parts[1] || ''

  if (provider !== 'kakao') return 'login'

  if (
    action === 'signup' ||
    action === 'login' ||
    action === 'find-id' ||
    action === 'find-password'
  ) {
    return action
  }

  return 'login'
}

function clearPkceCookie(res: NextResponse) {
  res.cookies.set(PKCE_COOKIE_NAME, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })

  return res
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const mode = searchParams.get('mode') || ''
  const code = searchParams.get('code') || ''
  const state = searchParams.get('state') || ''
  const error = searchParams.get('error') || ''
  const errorDescription =
    searchParams.get('error_description') || ''

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

  if (mode === 'start') {
    const loginMode =
      searchParams.get('login_mode') || 'kakao:login'

    const newState = makeState(loginMode)

    const codeVerifier = createCodeVerifier()
    const codeChallenge = createCodeChallenge(codeVerifier)

    const authorizeUrl = new URL(KAKAO_AUTHORIZE_ENDPOINT)

    authorizeUrl.searchParams.set('client_id', clientId)
    authorizeUrl.searchParams.set(
      'redirect_uri',
      KAKAO_REDIRECT_URI,
    )
    authorizeUrl.searchParams.set('response_type', 'code')
    authorizeUrl.searchParams.set('state', newState)
    authorizeUrl.searchParams.set(
      'code_challenge',
      codeChallenge,
    )
    authorizeUrl.searchParams.set(
      'code_challenge_method',
      'S256',
    )

    const res = NextResponse.redirect(
      authorizeUrl.toString(),
    )

    res.cookies.set(PKCE_COOKIE_NAME, codeVerifier, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 5,
      path: '/',
    })

    return res
  }

  if (error) {
    return clearPkceCookie(
      redirectToApp({
        provider: 'kakao',
        error,
        error_description: errorDescription,
        state,
        action: actionFromState(state),
      }),
    )
  }

  if (!code) {
    return clearPkceCookie(
      redirectToApp({
        provider: 'kakao',
        error: 'missing_code',
        state,
        action: actionFromState(state),
      }),
    )
  }

  if (!state) {
    return clearPkceCookie(
      redirectToApp({
        provider: 'kakao',
        error: 'missing_state',
      }),
    )
  }

  const codeVerifier =
    req.cookies.get(PKCE_COOKIE_NAME)?.value || ''

  if (!codeVerifier) {
    return clearPkceCookie(
      redirectToApp({
        provider: 'kakao',
        error: 'missing_code_verifier',
        state,
        action: actionFromState(state),
      }),
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
        code_verifier: codeVerifier,
      }).toString(),
    })

    const tokenData = await tokenRes.json().catch(() => ({}))

    if (!tokenRes.ok || !tokenData?.access_token) {
      return clearPkceCookie(
        redirectToApp({
          provider: 'kakao',
          error:
            tokenData?.error_description ||
            tokenData?.error ||
            'token_exchange_failed',
          state,
          action: actionFromState(state),
        }),
      )
    }

    const accessToken = String(tokenData.access_token)

    const userRes = await fetch(KAKAO_USER_ENDPOINT, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const userData = await userRes.json().catch(() => ({}))

    if (!userRes.ok || !userData?.id) {
      return clearPkceCookie(
        redirectToApp({
          provider: 'kakao',
          error:
            userData?.msg ||
            userData?.error_description ||
            userData?.error ||
            'kakao_me_failed',
          state,
          action: actionFromState(state),
        }),
      )
    }

    const socialId = String(userData.id)

    const name = pickStr(
      userData?.kakao_account?.profile?.nickname,
    ).trim()

    const email = pickStr(
      userData?.kakao_account?.email,
    ).trim()

    const action = actionFromState(state)

    return clearPkceCookie(
      redirectToApp({
        provider: 'kakao',
        verified: '1',
        social_id: socialId,
        name,
        social_email: email,
        state,
        action,
      }),
    )
  } catch {
    return clearPkceCookie(
      redirectToApp({
        provider: 'kakao',
        error: 'server_token_exchange_failed',
        state,
        action: actionFromState(state),
      }),
    )
  }
}
