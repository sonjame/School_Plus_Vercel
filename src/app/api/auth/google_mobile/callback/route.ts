import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type GoogleState = {
  state?: string
  appRedirectUri?: string
}

function safeJsonParse<T>(
  raw: string | null,
  fallback: T,
): T {
  if (!raw) return fallback

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export async function GET(req: Request) {
  const { searchParams } =
    new URL(req.url)

  const mode =
    searchParams.get('mode')

  const clientId =
    process.env.EXPO_GOOGLE_CLIENT_ID

  const clientSecret =
    process.env.EXPO_GOOGLE_CLIENT_SECRET

  const serverRedirectUri =
    process.env.EXPO_GOOGLE_REDIRECT_URI

  if (!clientId || !serverRedirectUri) {
    return NextResponse.json(
      {
        error:
          'missing_google_env',
      },
      {
        status: 500,
      },
    )
  }

  /*
  ==================
  START
  ==================
  */

  if (mode === 'start') {
    const state =
      searchParams.get(
        'state',
      ) ||
      `google:login:${Date.now()}`

    const appRedirectUri =
      searchParams.get(
        'redirect_uri',
      ) ||
      'myapp://oauth'

    const finalState =
      JSON.stringify({
        state,
        appRedirectUri,
      })

    const googleUrl =
      'https://accounts.google.com/o/oauth2/v2/auth?' +
      new URLSearchParams({
        client_id:
          clientId,

        redirect_uri:
          serverRedirectUri,

        response_type:
          'code',

        scope:
          'openid email profile',

        state:
          finalState,

        prompt:
          'select_account',
      }).toString()

    return NextResponse.redirect(
      googleUrl,
    )
  }

  /*
  ==================
  CALLBACK
  ==================
  */

  const code =
    searchParams.get(
      'code',
    )

  const error =
    searchParams.get(
      'error',
    )

  const rawState =
    searchParams.get(
      'state',
    )

  const parsedState =
    safeJsonParse<GoogleState>(
      rawState,
      {},
    )

  const appRedirectUri =
    parsedState.appRedirectUri ||
    'myapp://oauth'

  const originalState =
    parsedState.state ||
    ''

  if (error) {
    return NextResponse.redirect(
      `${appRedirectUri}?` +
        new URLSearchParams({
          provider:
            'google',

          state:
            originalState,

          oauth_error:
            error,
        }),
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `${appRedirectUri}?` +
        new URLSearchParams({
          provider:
            'google',

          state:
            originalState,

          oauth_error:
            'missing_code',
        }),
    )
  }

  if (!clientSecret) {
    return NextResponse.json(
      {
        error:
          'missing_secret',
      },
      {
        status: 500,
      },
    )
  }

  /*
  TOKEN
  */

  const tokenRes =
    await fetch(
      'https://oauth2.googleapis.com/token',
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',
        },

        body:
          new URLSearchParams(
            {
              code,

              client_id:
                clientId,

              client_secret:
                clientSecret,

              redirect_uri:
                serverRedirectUri,

              grant_type:
                'authorization_code',
            },
          ),
      },
    )

  const tokenJson: any =
    await tokenRes.json()

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      `${appRedirectUri}?` +
        new URLSearchParams({
          provider:
            'google',

          state:
            originalState,

          oauth_error:
            'token_failed',
        }),
    )
  }

  /*
  USERINFO
  */

  const meRes =
    await fetch(
      'https://openidconnect.googleapis.com/v1/userinfo',
      {
        headers: {
          Authorization:
            `Bearer ${tokenJson.access_token}`,
        },
      },
    )

  const me: any =
    await meRes.json()

  /*
  APP RETURN
  */

  return NextResponse.redirect(
    `${appRedirectUri}?` +
      new URLSearchParams({
        provider:
          'google',

        state:
          originalState,

        social_id:
          String(
            me.sub ||
              '',
          ),

        name:
          String(
            me.name ||
              '',
          ),

        social_email:
          String(
            me.email ||
              '',
          ),
      }),
  )
}
