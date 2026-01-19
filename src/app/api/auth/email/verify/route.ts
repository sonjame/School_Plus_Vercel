import { NextResponse } from 'next/server'
import { emailStore } from '@/src/lib/emailStore'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { email, code } = await req.json()

  const savedCode = emailStore.get(email)

  if (savedCode === code) {
    emailStore.delete(email) // 재사용 방지

    return NextResponse.json({
      success: true,
      redirect: `/auth/signup?verified=1&email=${encodeURIComponent(email)}`,
    })
  }

  return NextResponse.json({ success: false })
}
