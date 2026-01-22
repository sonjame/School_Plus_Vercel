import { NextResponse } from 'next/server'
import db from '@/src/lib/db'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json([])
    }

    const [rows]: any = await db.query(
      `
      SELECT
        p.id,
        p.title,
        p.content,
        p.category,
        p.likes,
        p.created_at,
        COALESCE(u.name, '알 수 없음') AS author
      FROM post_scraps s
      JOIN posts p ON s.post_id = p.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE s.user_id = ?
      ORDER BY p.created_at DESC
      `,
      [userId],
    )

    return NextResponse.json(rows)
  } catch (e) {
    console.error('❌ GET scrap list error', e)
    return NextResponse.json([], { status: 500 })
  }
}
