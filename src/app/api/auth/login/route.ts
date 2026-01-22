import db from '@/src/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json()

    /* =========================
       1️⃣ 유저 조회
    ========================= */
    const [rows]: any = await db.query(
      'SELECT * FROM users WHERE username = ?',
      [username.trim()],
    )

    if (rows.length === 0) {
      return NextResponse.json(
        { message: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 },
      )
    }

    const user = rows[0]

    /* =========================
       2️⃣ 비밀번호 검증
    ========================= */
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return NextResponse.json(
        { message: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 },
      )
    }

    /* =========================
       3️⃣ Access Token 발급
    ========================= */
    const accessToken = jwt.sign(
      {
        id: user.id,
        school_code: user.school_code,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' },
    )

    /* =========================
       4️⃣ Refresh Token 발급
    ========================= */
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '30d' },
    )

    /* =========================
       5️⃣ Refresh Token DB 저장 (1번만)
    ========================= */
    await db.query(
      `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))
      `,
      [user.id, refreshToken],
    )

    /* =========================
       6️⃣ 응답 + 쿠키 세팅
    ========================= */
    const res = NextResponse.json({
      ok: true,
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        school: user.school,
        grade: user.grade,
        level: user.level,
        eduCode: user.edu_code,
        schoolCode: user.school_code,
      },
    })

    res.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30일
    })

    return res
  } catch (e) {
    console.error('❌ login error:', e)
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
