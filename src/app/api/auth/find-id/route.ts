import { NextResponse } from 'next/server'
import { db } from '@/src/lib/db'
import { RowDataPacket } from 'mysql2'

export async function POST(req: Request) {
  const { method, email } = await req.json()

  let query = ''
  let params: string[] = []

  // ✅ 이메일 / 구글은 동일하게 처리
  if (method === 'email' || method === 'google') {
    query = 'SELECT username FROM users WHERE email = ?'
    params = [email]
  }

  // ✅ 카카오는 예외
  if (method === 'kakao') {
    return NextResponse.json(
      { message: '카카오 로그인 회원은 카카오 로그인을 이용해주세요.' },
      { status: 400 }
    )
  }

  const [rows] = await db.query<(RowDataPacket & { username: string })[]>(
    query,
    params
  )

  if (rows.length === 0) {
    return NextResponse.json(
      { message: '해당 정보로 가입된 회원이 없습니다.' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    username: rows[0].username,
  })
}
