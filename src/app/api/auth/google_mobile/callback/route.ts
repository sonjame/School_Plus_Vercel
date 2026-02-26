import { NextRequest, NextResponse } from 'next/server'

function pickStr(v: string | null) {
  return typeof v === 'string' ? v : ''
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const code = pickStr(searchParams.get('code'))
  const state = pickStr(searchParams.get('state'))
  const error = pickStr(searchParams.get('error'))
  const error_description = pickStr(searchParams.get('error_description'))

  // ✅ Google이 error로 돌아온 경우도 앱으로 전달
  if (error) {
    const to = new URL('myapp://oauth')
    to.searchParams.set('provider', 'google')
    if (state) to.searchParams.set('state', state)
    to.searchParams.set('ok', 'false')
    to.searchParams.set('error', error)
    if (error_description) to.searchParams.set('error_description', error_description)

    return NextResponse.redirect(to.toString())
  }

  if (!code) {
    return NextResponse.json({ ok: false, error: 'No code' }, { status: 400 })
  }

  // ✅ 토큰 교환은 “앱”이 한다. 서버는 code만 넘긴다.
  const to = new URL('myapp://oauth')
  to.searchParams.set('provider', 'google')
  to.searchParams.set('ok', 'true')
  to.searchParams.set('code', code)
  if (state) to.searchParams.set('state', state)

  return NextResponse.redirect(to.toString())
}
