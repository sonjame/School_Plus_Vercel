// app/api/posts/[id]/like/route.ts
import { NextResponse } from 'next/server'
import db from '@/src/lib/db'

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: postId } = await context.params
    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json({ message: 'userId required' }, { status: 400 })
    }

    // 중복 좋아요 체크
    const [[exist]]: any = await db.query(
      `SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?`,
      [postId, userId],
    )

    if (exist) {
      await db.query(
        `DELETE FROM post_likes WHERE post_id = ? AND user_id = ?`,
        [postId, userId],
      )
    } else {
      await db.query(
        `INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)`,
        [postId, userId],
      )
    }

    const [[{ count }]]: any = await db.query(
      `SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?`,
      [postId],
    )

    await db.query(`UPDATE posts SET likes = ? WHERE id = ?`, [count, postId])

    return NextResponse.json({ likes: count })
  } catch (e) {
    console.error('❌ POST /like error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
