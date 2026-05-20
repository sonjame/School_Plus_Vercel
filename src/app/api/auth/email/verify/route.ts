import { NextResponse } from 'next/server'
import { emailStore } from '@/src/lib/emailStore'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const body = await req.json()

  const email = String(body.email || '').trim().toLowerCase()
  const code = String(body.code || '').trim().replace(/\s/g, '')

  const savedCode = emailStore.get(email)

  // 디버깅용
  console.log('입력 이메일:', email)
  console.log('입력 코드:', code)
  console.log('저장 코드:', savedCode)

  if (savedCode === code) {
    emailStore.delete(email)

    return NextResponse.json({
      success: true,
      redirect: `/auth/signup?verified=1&email=${encodeURIComponent(email)}`,
    })
  }

  return NextResponse.json({ success: false })
}
