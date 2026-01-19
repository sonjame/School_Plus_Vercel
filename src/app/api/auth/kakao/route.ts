import { NextResponse } from 'next/server'

const REST_API_KEY = process.env.KAKAO_REST_API_KEY!
const REDIRECT_URI = process.env.KAKAO_REDIRECT_URI!

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode') // 👈 추가

  const kakaoAuthUrl =
    `https://kauth.kakao.com/oauth/authorize?response_type=code` +
    `&client_id=${REST_API_KEY}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&prompt=login` +
    (mode ? `&state=${mode}` : '') // 👈 핵심

  return NextResponse.redirect(kakaoAuthUrl)
}
