import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET() {
  const state = crypto.randomBytes(16).toString('hex')

  const redirectUri =
    'https://school-plus-vercel.vercel.app/api/auth/google_mobile/callback'

  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=openid%20profile%20email` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&state=${state}`

  return NextResponse.json({
    ok: true,
    authUrl,
    state
  })
}
