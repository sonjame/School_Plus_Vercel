import { NextRequest, NextResponse } from 'next/server'

function pickStr(v: string | null) {
  return typeof v === 'string' ? v : ''
}

function mustEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const code = pickStr(searchParams.get('code'))
  const state = pickStr(searchParams.get('state'))
  const error = pickStr(searchParams.get('error'))
  const error_description =
    pickStr(searchParams.get('error_description')) ||
    pickStr(searchParams.get('error'))

  // ✅ ✅ 여기만 변경됨
  const to = new URL('myapp://oAuth/googleoauth')
  to.searchParams.set('provider', 'google')
  if (state) to.searchParams.set('state', state)

  // 1) Google에서 에러로 돌아온 경우 → 그대로 앱으로 전달
  if (error) {
    to.searchParams.set('ok', 'false')
    to.searchParams.set('error', error)
    if (error_description) to.searchParams.set('error_description', error_description)
    return NextResponse.redirect(to.toString())
  }

  // 2) code 없으면 비정상
  if (!code) {
    to.searchParams.set('ok', 'false')
    to.searchParams.set('error', 'missing_code')
    return NextResponse.redirect(to.toString())
  }

  // 3) 서버에서 토큰 교환
  try {
    const clientId = mustEnv('GOOGLE_WEB_CLIENT_ID')
    const clientSecret = mustEnv('GOOGLE_WEB_CLIENT_SECRET')

    // authorize 때 사용한 redirect_uri와 완전히 동일해야 함
    const redirectUri = mustEnv('GOOGLE_MOBILE_REDIRECT_URI')

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenJson = (await tokenRes.json()) as any

    if (!tokenRes.ok) {
      to.searchParams.set('ok', 'false')
      to.searchParams.set('error', pickStr(tokenJson?.error) || 'token_exchange_failed')
      to.searchParams.set(
        'error_description',
        pickStr(tokenJson?.error_description) || `HTTP ${tokenRes.status}`
      )
      return NextResponse.redirect(to.toString())
    }

    // 성공 → 토큰을 앱으로 전달
    to.searchParams.set('ok', 'true')
    if (tokenJson.access_token)
      to.searchParams.set('access_token', String(tokenJson.access_token))
    if (tokenJson.id_token)
      to.searchParams.set('id_token', String(tokenJson.id_token))
    if (tokenJson.expires_in != null)
      to.searchParams.set('expires_in', String(tokenJson.expires_in))
    if (tokenJson.scope)
      to.searchParams.set('scope', String(tokenJson.scope))
    if (tokenJson.token_type)
      to.searchParams.set('token_type', String(tokenJson.token_type))

    return NextResponse.redirect(to.toString())
  } catch (e: any) {
    to.searchParams.set('ok', 'false')
    to.searchParams.set('error', 'server_error')
    to.searchParams.set('error_description', pickStr(e?.message) || 'Unknown error')
    return NextResponse.redirect(to.toString())
  }
}
