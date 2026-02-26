import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code) {
    return NextResponse.json({ ok: false, error: 'No code' }, { status: 400 })
  }

  const redirectUri =
    'https://school-plus-vercel.vercel.app/api/auth/google_mobile/callback'

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  })

  const tokenData = await tokenRes.json()

  if (!tokenRes.ok) {
    return NextResponse.json({ ok: false, error: tokenData }, { status: 400 })
  }

  const userRes = await fetch(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    }
  )

  const user = await userRes.json()

  return NextResponse.redirect(
    `myapp://oauth?email=${user.email}&name=${user.name}`
  )
}
