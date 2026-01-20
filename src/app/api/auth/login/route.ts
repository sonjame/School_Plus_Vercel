import { db } from '@/src/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { username, password } = await req.json()

  const [rows]: any = await db.query('SELECT * FROM users WHERE username = ?', [
    username.trim(),
  ])

  if (rows.length === 0) {
    return NextResponse.json(
      { message: '아이디 또는 비밀번호가 올바르지 않습니다.' },
      { status: 401 },
    )
  }

  const user = rows[0]

  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) {
    return NextResponse.json(
      { message: '아이디 또는 비밀번호가 올바르지 않습니다.' },
      { status: 401 },
    )
  }

  // 🔥 JWT 발급 (가장 중요)
  const accessToken = jwt.sign(
    {
      id: user.id,
      school_code: user.school_code, // ⭐️ 반드시 추가
    },
    process.env.JWT_SECRET as string,
    { expiresIn: '1h' },
  )

  const refreshToken = jwt.sign(
    {
      id: user.id,
    },
    process.env.JWT_REFRESH_SECRET as string,
    { expiresIn: '30d' },
  )

  await db.query(
    `
  INSERT INTO refresh_tokens (user_id, token, expires_at)
  VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))
  `,
    [user.id, refreshToken],
  )

  return NextResponse.json({
    ok: true,
    accessToken,
    refreshToken,
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
}
