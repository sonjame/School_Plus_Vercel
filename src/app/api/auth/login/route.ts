import db from '@/src/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json(
        { message: '아이디와 비밀번호를 입력해주세요.' },
        { status: 400 },
      )
    }

    /* 1️⃣ 유저 조회 */
    const [rows]: any = await db.query(
      'SELECT * FROM users WHERE username = ?',
      [username.trim()],
    )

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { message: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 },
      )
    }

    const user = rows[0]

    /* 🔥 비밀번호 null 방어 */
    if (!user.password) {
      console.error('❌ password is null for user:', user.username)
      return NextResponse.json(
        { message: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 },
      )
    }

    /* 2️⃣ 비밀번호 검증 */
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return NextResponse.json(
        { message: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 },
      )
    }

    /* 🔥 계정 정지 체크 (비밀번호 검증 후, 토큰 발급 전) */
    if (user.is_banned) {
      return NextResponse.json(
        {
          message: '계정이 정지되었습니다.',
          reason: user.banned_reason,
        },
        { status: 403 },
      )
    }

    /* 🔥 ENV 체크 */
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      console.error('❌ JWT env missing')
      return NextResponse.json({ message: '서버 설정 오류' }, { status: 500 })
    }

    /* 3️⃣ Access Token */
    const accessToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
        level: user.level,
        school_code: user.school_code, // ⭐ 이 줄 추가
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1h',
      },
    )

    /* 4️⃣ Refresh Token */
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '30d' },
    )

    /* 5️⃣ Refresh Token 저장 (실패해도 로그인은 성공시키기) */
    try {
      await db.query(
        `
        INSERT INTO refresh_tokens (user_id, token, expires_at)
        VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))
        `,
        [user.id, refreshToken],
      )
    } catch (err) {
      console.error('⚠️ refresh token save failed:', err)
    }

    /* 6️⃣ 응답 */
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
        classNum: user.class_num,
        profileImageUrl: user.profile_image_url,
      },
    })

    res.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,

      secure: process.env.NODE_ENV === 'production',

      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',

      path: '/',

      maxAge: 60 * 60 * 24 * 30,
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
