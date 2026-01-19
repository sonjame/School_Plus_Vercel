import { db } from '@/src/lib/db'
import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'

export async function POST(req: Request) {
  try {
    const {
      username,
      password,
      name,
      email,
      school,
      schoolCode,
      eduCode,
      level,
      grade,
      social_id,
    } = await req.json()

    // 🔐 비밀번호 검증 (카카오 포함)
    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/

    if (!password || !passwordRegex.test(password)) {
      return NextResponse.json(
        { message: '비밀번호 조건을 만족하지 않습니다.' },
        { status: 400 }
      )
    }

    // ✅ 무조건 사용자가 입력한 비밀번호 사용
    const hashedPassword = await bcrypt.hash(password, 10)

    await db.query(
      `INSERT INTO users 
   (username, password, name, email, social_id, school, school_code, edu_code, level, grade)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        username,
        hashedPassword,
        name,
        email,
        social_id, // 🔥 이게 NULL이면 안 됨
        school,
        schoolCode,
        eduCode,
        level,
        grade,
      ]
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('signup error:', err)
    return NextResponse.json(
      { message: '회원가입 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
