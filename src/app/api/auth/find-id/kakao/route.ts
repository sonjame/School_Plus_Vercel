import { NextResponse } from 'next/server'
import { db } from '@/src/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const social_id = searchParams.get('social_id')

  if (!social_id) {
    return NextResponse.json(
      { message: 'social_id가 없습니다.' },
      { status: 400 }
    )
  }

  const [rows]: any = await db.query(
    'SELECT username FROM users WHERE social_id = ?',
    [social_id]
  )

  if (rows.length === 0) {
    return NextResponse.json(
      { message: '해당 카카오 계정으로 가입된 아이디가 없습니다.' },
      { status: 404 }
    )
  }

  return NextResponse.json({ username: rows[0].username })
}
