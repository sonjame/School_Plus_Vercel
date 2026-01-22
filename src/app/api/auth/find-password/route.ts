import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import bcrypt from 'bcrypt'
import nodemailer from 'nodemailer'

export async function POST(req: Request) {
  try {
    const { username, email } = await req.json()

    if (!username || !email) {
      return NextResponse.json(
        { message: '아이디와 이메일을 입력하세요.' },
        { status: 400 },
      )
    }

    // ✅ 이메일 / 구글 계정만 허용 (카카오 제외)
    const [rows]: any = await db.query(
      `
      SELECT id
      FROM users
      WHERE username = ?
        AND email = ?
        AND provider IN ('email', 'google')
      `,
      [username, email],
    )

    if (rows.length === 0) {
      return NextResponse.json(
        {
          message:
            '아이디 또는 이메일이 일치하지 않거나 비밀번호 재설정이 불가능한 계정입니다.',
        },
        { status: 404 },
      )
    }

    // ✅ 임시 비밀번호 생성
    const tempPw = 'SC' + Math.floor(100000 + Math.random() * 900000)
    const hashed = await bcrypt.hash(tempPw, 10)

    await db.query(
      `
      UPDATE users
      SET password = ?
      WHERE id = ?
      `,
      [hashed, rows[0].id],
    )

    // ✅ 이메일 발송
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASS!,
      },
    })

    await transporter.sendMail({
      from: `"SchoolPlus" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '[SchoolPlus] 임시 비밀번호 안내',
      html: `
        <div style="font-family: Arial; line-height:1.6">
          <h2>임시 비밀번호 발급</h2>
          <p>안녕하세요, <b>${username}</b> 님</p>
          <p>임시 비밀번호는 아래와 같습니다.</p>
          <h3 style="color:#1976D2">${tempPw}</h3>
          <p>로그인 후 반드시 비밀번호를 변경해주세요.</p>
        </div>
      `,
    })

    return NextResponse.json({
      message: '임시 비밀번호를 이메일로 전송했습니다.',
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { message: '서버 내부 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
