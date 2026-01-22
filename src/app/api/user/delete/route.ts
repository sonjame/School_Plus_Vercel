import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
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
      'SELECT password FROM users WHERE username = ?',
      [username],
    )

    if (rows.length === 0) {
      return NextResponse.json(
        { message: '사용자를 찾을 수 없습니다.' },
        { status: 404 },
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

    // 3️⃣ 삭제
    await db.query('DELETE FROM users WHERE username = ?', [username])

    return NextResponse.json({ message: '회원탈퇴 완료' }, { status: 200 })
  } catch (err: any) {
    console.error('회원탈퇴 API 오류:', err)
    return NextResponse.json(
      { message: '서버 오류', error: err?.message },
      { status: 500 },
    )
  }
}
