import db from '@/src/lib/db'
import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export async function GET(req: Request) {
  /* 🔐 JWT 인증 */
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json([], { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)

  const userId = decoded.id // ✅ 여기서 id 확보

  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year'))
  const semester = searchParams.get('semester') // '1학기' | '2학기'

  if (!year || !semester) {
    return NextResponse.json([], { status: 200 })
  }

  const [rows] = await db.query(
    `
    SELECT DISTINCT subject
    FROM timetables
    WHERE user_id = ?
      AND year = ?
      AND semester = ?
    `,
    [userId, year, semester],
  )

  return NextResponse.json(rows)
}
