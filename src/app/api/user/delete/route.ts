import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import db from '@/src/lib/db'

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json(
        { message: '요청 값이 올바르지 않습니다.' },
        { status: 400 },
      )
    }

    // 1️⃣ 사용자 조회
    const [rows]: any = await db.query(
      `
      SELECT password, is_banned, provider, social_id, email
      FROM users
      WHERE username = ?
      `,
      [username],
    )

    if (rows.length === 0) {
      return NextResponse.json(
        { message: '사용자를 찾을 수 없습니다.' },
        { status: 404 },
      )
    }

    const user = rows[0]

    if (user.is_banned) {
      return NextResponse.json(
        { message: '이미 탈퇴했거나 정지된 계정입니다.' },
        { status: 403 },
      )
    }

    // 2️⃣ 비밀번호 확인 (email 계정만)
    if (user.provider === 'email') {
      const isMatch = await bcrypt.compare(password, user.password)
      if (!isMatch) {
        return NextResponse.json(
          { message: '비밀번호가 일치하지 않습니다.' },
          { status: 401 },
        )
      }
    }

    // 3️⃣ deleted_users 기록 (🔥 핵심)
    await db.query(
      `
  INSERT INTO deleted_users (
    username,
    email,
    provider,
    social_id,
    deleted_at,
    rejoin_available_at,
    admin_override,
    ban_type
  )
  VALUES (?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 0, 'temporary')
  `,
      [
        username,
        user.provider === 'email' ? user.email : null,
        user.provider,
        user.social_id,
      ],
    )

    // 4️⃣ users 논리적 탈퇴
    await db.query(
      `
      UPDATE users
      SET
        is_banned = 1,
        banned_at = NOW(),
        password = NULL
      WHERE username = ?
      `,
      [username],
    )

    return NextResponse.json(
      { message: '회원탈퇴가 완료되었습니다.' },
      { status: 200 },
    )
  } catch (err: any) {
    console.error('회원탈퇴 API 오류:', err)
    return NextResponse.json(
      { message: '서버 오류', error: err?.message },
      { status: 500 },
    )
  }
}
