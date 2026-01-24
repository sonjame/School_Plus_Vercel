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

    /* ===============================
       1️⃣ 비밀번호 검증
    =============================== */
    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/

    if (!password || !passwordRegex.test(password)) {
      return NextResponse.json(
        { message: '비밀번호 조건을 만족하지 않습니다.' },
        { status: 400 },
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    /* ===============================
       2️⃣ provider 그대로 사용
    =============================== */
    const authProvider: 'email' | 'kakao' | 'google' =
      provider === 'kakao' || provider === 'google' ? provider : 'email'

    /* ===============================
       3️⃣ social_id 규칙
    =============================== */
    const finalSocialId = authProvider === 'email' ? null : social_id

    /* ===============================
       4️⃣ INSERT
    =============================== */
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
        finalSocialId,
        school,
        schoolCode,
        eduCode,
        level,
        grade,
        authProvider,
      ],
    )

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('signup error:', err)

    // 🔴 혹시 DB UNIQUE 에러면 메시지 분리
    if (err?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { message: '이미 존재하는 계정 정보입니다.' },
        { status: 409 },
      )
    }

    return NextResponse.json(
      { message: '회원가입 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
