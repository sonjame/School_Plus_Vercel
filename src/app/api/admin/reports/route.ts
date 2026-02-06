import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  const token = auth?.replace('Bearer ', '')
  const decoded: any = jwt.verify(token!, process.env.JWT_SECRET!)

  if (decoded.level !== 'admin') {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 })
  }

  const [rows] = await db.query(`
    SELECT
      r.id,
      r.type,
      r.content,
      r.created_at,
      p.id AS post_id,
      p.title,
      p.is_hidden,
      u.username AS reporter
    FROM post_reports r
    JOIN posts p ON p.id = r.post_id
    JOIN users u ON u.id = r.user_id
    ORDER BY r.created_at DESC
  `)

  return NextResponse.json(rows)
}
