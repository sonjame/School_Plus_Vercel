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

    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/

    if (!password || !passwordRegex.test(password)) {
      return NextResponse.json(
        { message: '비밀번호 조건을 만족하지 않습니다.' },
        { status: 400 },
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // ✅ provider는 추론하지 말고 그대로 사용
    const authProvider: 'email' | 'kakao' | 'google' = provider ?? 'email'

    // 🔥 테스트용 social_id (중복 허용)
    const realSocialId = social_id
    const testSocialId =
      process.env.NODE_ENV === 'development' && realSocialId
        ? `${realSocialId}_${Date.now()}`
        : realSocialId

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
        authProvider === 'email' ? null : testSocialId,
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
