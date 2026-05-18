import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const KAKAO_TOKEN_ENDPOINT =
  'https://kauth.kakao.com/oauth/token'

const KAKAO_USER_ENDPOINT =
  'https://kapi.kakao.com/v2/user/me'

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

function pickStr(v: unknown) {
  return typeof v === 'string' ? v : ''
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
      action: actionFromState(state),
    })
  }

  if (!code) {
    return redirectToApp({
      provider: 'kakao',
      error: 'missing_code',
      state,
      action: actionFromState(state),
    })
  }

  if (!state) {
    return redirectToApp({
      provider: 'kakao',
      error: 'missing_state',
    })
  }

  // ✅ 서버는 더 이상 code_verifier를 저장하지 않음.
  // ✅ 카카오가 준 code/state만 앱 딥링크로 넘김.
  // ✅ 앱이 AsyncStorage에서 code_verifier를 꺼내 POST로 다시 보냄.
  return redirectToApp({
    provider: 'kakao',
    code,
    state,
    action: actionFromState(state),
  })
}

export async function POST(req: NextRequest) {
  const clientId =
    process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY?.trim()

  const clientSecret =
    process.env.EXPO_PUBLIC_KAKAO_CLIENT_SECRET?.trim()

  if (!clientId) {
    return NextResponse.json(
      { error: 'missing_kakao_client_id' },
      { status: 500 },
    )
  }

  if (!clientSecret) {
    return NextResponse.json(
      { error: 'missing_kakao_client_secret' },
      { status: 500 },
    )
  }

  let body: any = {}

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'invalid_json_body' },
      { status: 400 },
    )
  }

  const code = pickStr(body.code).trim()
  const state = pickStr(body.state).trim()
  const codeVerifier =
    pickStr(body.code_verifier).trim()

  if (!code) {
    return NextResponse.json(
      {
        error: 'missing_code',
        state,
        action: actionFromState(state),
      },
      { status: 400 },
    )
  }

  if (!state) {
    return NextResponse.json(
      { error: 'missing_state' },
      { status: 400 },
    )
  }

  if (!codeVerifier) {
    return NextResponse.json(
      {
        error: 'missing_code_verifier',
        state,
        action: actionFromState(state),
      },
      { status: 400 },
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
      return NextResponse.json(
        {
          error:
            tokenData?.error_description ||
            tokenData?.error ||
            'token_exchange_failed',
          state,
          action: actionFromState(state),
        },
        { status: 400 },
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
      return NextResponse.json(
        {
          error:
            userData?.msg ||
            userData?.error_description ||
            userData?.error ||
            'kakao_me_failed',
          state,
          action: actionFromState(state),
        },
        { status: 400 },
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

    return NextResponse.json({
      provider: 'kakao',
      verified: '1',
      social_id: socialId,
      name,
      social_email: email,
      state,
      action,
    })
  } catch {
    return NextResponse.json(
      {
        error: 'server_token_exchange_failed',
        state,
        action: actionFromState(state),
      },
      { status: 500 },
    )
  }
}
