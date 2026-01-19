import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { db } from '@/src/lib/db'

export async function POST(req: Request) {
  const { username, currentPw, newPw } = await req.json()

  if (!username || !currentPw || !newPw) {
    return NextResponse.json(
      { message: '요청 값이 올바르지 않습니다.' },
      { status: 400 }
    )
  }

  // 1️⃣ 사용자 조회
  const [rows]: any = await db.query(
    'SELECT password FROM users WHERE username = ?',
    [username]
  )

  if (rows.length === 0) {
    return NextResponse.json(
      { message: '사용자를 찾을 수 없습니다.' },
      { status: 404 }
    )
  }

  // 2️⃣ 현재 비밀번호 비교
  const isMatch = await bcrypt.compare(currentPw, rows[0].password)
  if (!isMatch) {
    return NextResponse.json(
      { message: '현재 비밀번호가 일치하지 않습니다.' },
      { status: 401 }
    )
  }

  // 3️⃣ 새 비밀번호 해시
  const hashedPw = await bcrypt.hash(newPw, 10)

  // 4️⃣ DB 업데이트
  await db.query('UPDATE users SET password = ? WHERE username = ?', [
    hashedPw,
    username,
  ])

  return NextResponse.json({ message: '비밀번호 변경 완료' })
}
