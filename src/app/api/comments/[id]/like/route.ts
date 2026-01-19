import { NextResponse } from 'next/server'
import { db } from '@/src/lib/db'
import jwt from 'jsonwebtoken'

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> } // ✅ Promise
) {
  try {
    // ✅ 반드시 await
    const { id: commentId } = await context.params

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)
    const userId = decoded.id

    const [[exist]]: any = await db.query(
      `SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?`,
      [commentId, userId]
    )

    if (exist) {
      await db.query(
        `DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?`,
        [commentId, userId]
      )
    } else {
      await db.query(
        `INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)`,
        [commentId, userId]
      )
    }

    const [[{ count }]]: any = await db.query(
      `SELECT COUNT(*) AS count FROM comment_likes WHERE comment_id = ?`,
      [commentId]
    )

    return NextResponse.json({ likes: count })
  } catch (e) {
    console.error('❌ comment like error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
