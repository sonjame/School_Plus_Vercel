import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'
import { mailer } from '@/src/lib/mailer'

const JWT_SECRET = process.env.JWT_SECRET!

interface JwtPayload {
  id: number
  username: string
  level: 'admin' | 'student'
}

export async function POST(req: Request) {
  try {
    /* ===============================
       🔐 관리자 인증
    =============================== */
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: '인증 토큰이 없습니다.' },
        { status: 401 },
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload

    if (decoded.level !== 'admin') {
      return NextResponse.json(
        { message: '관리자 권한이 필요합니다.' },
        { status: 403 },
      )
    }

    /* ===============================
       📥 요청 값
    =============================== */
    const { deletedUserId } = await req.json()
    if (!deletedUserId) {
      return NextResponse.json({ message: '필수 값 누락' }, { status: 400 })
    }

    /* ===============================
       1️⃣ 대상 사용자 조회
    =============================== */
    const [rows]: any = await db.query(
      `
      SELECT email, provider, username
      FROM deleted_users
      WHERE id = ?
      LIMIT 1
      `,
      [deletedUserId],
    )

    if (rows.length === 0) {
      return NextResponse.json(
        { message: '대상 계정을 찾을 수 없습니다.' },
        { status: 404 },
      )
    }

    const { email, provider, username } = rows[0]

    /* ===============================
       2️⃣ 재가입 승인 처리
    =============================== */
    await db.query(
      `
      UPDATE deleted_users
      SET
        admin_override = 1,
        override_at = NOW(),
        override_by = ?
      WHERE id = ?
      `,
      [decoded.username, deletedUserId],
    )

    /* ===============================
   3️⃣ 📧 이메일 계정이면 메일 발송
  =============================== */
    if (email) {
      const baseUrl = process.env.BASE_URL
      if (!baseUrl) throw new Error('BASE_URL 환경변수 없음')

      await mailer.sendMail({
        from: process.env.MAIL_FROM,
        to: email,
        subject: '[SchoolPlus] 재가입 승인 완료',
        html: `
      <div style="font-family: Arial; line-height:1.6">
        <h2>🎉 재가입 승인 완료</h2>
        <p>
          관리자에 의해 <b>${username}</b> 계정의
          <b>회원 재가입이 승인</b>되었습니다.
        </p>
        <p>아래 버튼을 눌러 다시 가입을 진행해주세요.</p>
        <a href="${baseUrl}/auth/signup"
           style="display:inline-block;padding:10px 16px;
                  background:#4FC3F7;color:white;border-radius:6px;
                  text-decoration:none;font-weight:600;">
          회원가입 하러가기
        </a>
        <p style="margin-top:20px;color:#777">
          SchoolPlus 관리자
        </p>
      </div>
    `,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('재가입 승인 오류:', err)
    return NextResponse.json({ message: '승인 실패' }, { status: 500 })
  }
}
