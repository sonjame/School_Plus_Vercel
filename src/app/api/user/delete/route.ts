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

    // 1️⃣ 사용자 조회 (탈퇴/정지 안 된 계정만)
    const [rows]: any = await db.query(
      `
      SELECT password, is_banned
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

    if (rows[0].is_banned) {
      return NextResponse.json(
        { message: '이미 탈퇴했거나 정지된 계정입니다.' },
        { status: 403 },
      )
    }

    // 2️⃣ 비밀번호 확인
    const isMatch = await bcrypt.compare(password, rows[0].password)
    if (!isMatch) {
      return NextResponse.json(
        { message: '비밀번호가 일치하지 않습니다.' },
        { status: 401 },
      )
    }

    // 3️⃣ 🔥 실제 삭제 ❌ → 논리적 탈퇴 ✅
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
