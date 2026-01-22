import { NextResponse } from 'next/server'
import db from '@/src/lib/db'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json([], { status: 200 })
    }

    const [rows]: any = await db.query(
      `
      SELECT 
        p.id,
        p.title,
        p.content,
        p.category,
        p.likes,
        COALESCE(u.name, '알 수 없음') AS author,
        p.created_at AS createdAt
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
      `,
      [userId],
    )

    return NextResponse.json(rows)
  } catch (e) {
    console.error('❌ myposts error', e)
    return NextResponse.json([], { status: 200 })
  }
}
