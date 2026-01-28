import { NextResponse } from 'next/server'
import db from '@/src/lib/db'

export async function POST(req: Request) {
  const { username, classNum } = await req.json()

  if (!username) {
    return NextResponse.json(
      { message: '유효하지 않은 요청입니다.' },
      { status: 400 },
    )
  }

  // 1️⃣ 업데이트
  await db.query('UPDATE users SET class_num = ? WHERE username = ?', [
    classNum ?? null,
    username,
  ])

  // 2️⃣ 다시 조회 (🔥 핵심)
  const [[user]]: any = await db.query(
    'SELECT class_num FROM users WHERE username = ?',
    [username],
  )

  // 3️⃣ DB 기준으로 응답
  return NextResponse.json({
    classNum: user?.class_num ?? null,
  })
}
