import db from '@/src/lib/db'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

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
      provider,
    } = await req.json()

    // 🔐 비밀번호 검증 (카카오 포함)
    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/

    if (!password || !passwordRegex.test(password)) {
      return NextResponse.json(
        { message: '비밀번호 조건을 만족하지 않습니다.' },
        { status: 400 },
      )
    }

    // ✅ 무조건 사용자가 입력한 비밀번호 사용
    const hashedPassword = await bcrypt.hash(password, 10)

    const authProvider: 'email' | 'kakao' | 'google' =
      provider ??
      (social_id
        ? 'kakao' // 실제로는 인증 완료 API에서 명확히 지정
        : 'email')

    await db.query(
      `INSERT INTO users 
       (username, password, name, email, social_id,
        school, school_code, edu_code, level, grade, provider)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        username,
        hashedPassword,
        name,
        email,
        authProvider === 'email' ? null : social_id,
        school,
        schoolCode,
        eduCode,
        level,
        grade,
        authProvider,
      ],
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('signup error:', err)
    return NextResponse.json(
      { message: '회원가입 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
