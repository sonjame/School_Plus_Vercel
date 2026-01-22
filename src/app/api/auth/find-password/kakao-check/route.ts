import { NextResponse } from 'next/server'
import db from '@/src/lib/db'

export async function POST(req: Request) {
  const { username } = await req.json()

  if (!username) {
    return NextResponse.json(
      { message: '아이디를 입력하세요.' },
      { status: 400 },
    )
  }

  const [rows]: any = await db.query(
    `
    SELECT id
    FROM users
    WHERE username = ?
      AND provider = 'kakao'
    `,
    [username],
  )

  if (rows.length === 0) {
    return NextResponse.json(
      { message: '카카오로 가입한 아이디가 아닙니다.' },
      { status: 404 },
    )
  }

  return NextResponse.json({ ok: true })
}
