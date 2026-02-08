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
      class_num,
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
   2️⃣ provider 검증
    =============================== */
    if (provider !== 'email' && provider !== 'kakao' && provider !== 'google') {
      return NextResponse.json(
        { message: 'provider 값이 올바르지 않습니다.' },
        { status: 400 },
      )
    }

    const authProvider = provider

    /* ===============================
   3️⃣ social_id 규칙
    =============================== */
    if (authProvider !== 'email' && !social_id) {
      return NextResponse.json(
        { message: 'social_id가 필요합니다.' },
        { status: 400 },
      )
    }

    const finalSocialId = authProvider === 'email' ? null : social_id

    /* ===============================
🚫 영구정지 계정 재가입 차단 (FIX)
=============================== */

    let banCheckQuery = ''
    let banCheckParams: any[] = []

    if (authProvider === 'email') {
      if (!email) {
        return NextResponse.json(
          { message: '이메일 정보가 없습니다.' },
          { status: 400 },
        )
      }

      banCheckQuery = `
    SELECT ban_type
    FROM deleted_users
    WHERE provider = 'email'
      AND email = ?
    LIMIT 1
  `
      banCheckParams = [email]
    } else {
      banCheckQuery = `
    SELECT ban_type
    FROM deleted_users
    WHERE provider = ?
      AND social_id = ?
    LIMIT 1
  `
      banCheckParams = [authProvider, finalSocialId]
    }

    const [banRows]: any = await db.query(banCheckQuery, banCheckParams)

    if (banRows.length > 0 && banRows[0].ban_type === 'permanent') {
      return NextResponse.json(
        { message: '해당 계정은 영구 정지되어 회원가입이 불가능합니다.' },
        { status: 403 },
      )
    }

    /* ===============================
  🚫 탈퇴 후 30일 재가입 제한 + 관리자 override
  =============================== */

    let deletedQuery = ''
    let deletedParams: any[] = []

    if (authProvider === 'email') {
      if (!email) {
        return NextResponse.json(
          { message: '이메일 정보가 없습니다.' },
          { status: 400 },
        )
      }

      deletedQuery = `
    SELECT rejoin_available_at, admin_override
    FROM deleted_users
    WHERE provider = 'email'
      AND email = ?
    LIMIT 1
  `
      deletedParams = [email]
    } else {
      deletedQuery = `
    SELECT rejoin_available_at, admin_override
    FROM deleted_users
    WHERE provider = ?
      AND social_id = ?
    LIMIT 1
  `
      deletedParams = [authProvider, finalSocialId]
    }

    const [deletedRows]: any = await db.query(deletedQuery, deletedParams)

    if (deletedRows.length > 0) {
      const { rejoin_available_at, admin_override } = deletedRows[0]
      const now = new Date()
      const rejoinAt = new Date(rejoin_available_at)

      // ✅ 관리자 승인 있으면 즉시 통과
      if (!admin_override) {
        // ⏳ 관리자 승인 없을 때만 30일 제한
        if (now < rejoinAt) {
          return NextResponse.json(
            {
              message: '탈퇴 후 30일 이내에는 재가입할 수 없습니다.',
              status: 'WAIT',
              rejoinAvailableAt: rejoin_available_at,
            },
            { status: 403 },
          )
        }

        // ❌ 30일은 지났지만 승인 없음
        return NextResponse.json(
          {
            message: '재가입을 위해 관리자 승인이 필요합니다.',
            status: 'NEED_ADMIN_APPROVAL',
          },
          { status: 403 },
        )
      }

      // 👉 여기까지 왔다는 건
      // admin_override === 1 → 가입 허용
    }

    /* ===============================
       4️⃣ INSERT
    =============================== */
    await db.query(
      `INSERT INTO users 
       (username, password, name, email, social_id,
        school, school_code, edu_code, level, grade, class_num, provider)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        class_num,
        authProvider,
      ],
    )

    /* ===============================
   5️⃣ 재가입 성공 → 탈퇴 기록 삭제
  =============================== */
    if (authProvider === 'email') {
      await db.query(
        `
    DELETE FROM deleted_users
    WHERE provider = 'email'
      AND email = ?
    `,
        [email],
      )
    } else {
      await db.query(
        `
    DELETE FROM deleted_users
    WHERE provider = ?
      AND social_id = ?
    `,
        [authProvider, finalSocialId],
      )
    }

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
