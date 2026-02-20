import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

export async function GET(req: Request) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth) return NextResponse.json([], { status: 401 })

    const token = auth.replace('Bearer ', '')
    const decoded: any = jwt.verify(token, JWT_SECRET)

    if (decoded.level !== 'admin') {
      return NextResponse.json([], { status: 403 })
    }

    /* ===============================
       🔥 한 번에 집계 (최적화)
    =============================== */

    const [users]: any = await db.query(`
  SELECT 
    u.id,
    u.username,
    u.name,
    u.email,
    u.school,
    u.grade,
    u.class_num,
    u.provider,
    u.created_at,
    u.is_banned,
    u.level,

    COUNT(DISTINCT p.id) AS postCount,
    COUNT(DISTINCT c.id) AS commentCount

  FROM users u

  LEFT JOIN posts p 
    ON p.user_id = u.id

  LEFT JOIN post_comments c 
    ON c.user_id = u.id

  GROUP BY u.id

  ORDER BY 
    CASE WHEN u.level = 'admin' THEN 0 ELSE 1 END,
    u.created_at DESC
`)

    return NextResponse.json(users)
  } catch (err) {
    console.error(err)
    return NextResponse.json([], { status: 500 })
  }
}
