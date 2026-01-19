import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { emailStore } from '@/src/lib/emailStore'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { email } = await req.json()

  if (!email) {
    return NextResponse.json({ success: false })
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString()

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER!,
      pass: process.env.EMAIL_PASS!,
    },
  })

  await transporter.sendMail({
    from: process.env.EMAIL_USER!,
    to: email,
    subject: '학교 커뮤니티 앱 이메일 인증코드',
    text: `인증코드: ${code}`,
  })

  // ✅ 이메일별 코드 저장
  emailStore.set(email, code)

  return NextResponse.json({ success: true })
}
