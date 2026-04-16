import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: commentId } = await context.params // ✅ 핵심
    const { content } = await req.json()

    if (!content?.trim()) {
      return NextResponse.json({ message: 'content required' }, { status: 400 })
    }

    /* 🔐 JWT 인증 */
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)
    const userId = decoded.id

    /* 🔍 댓글 소유자 확인 */
    const [[comment]]: any = await db.query(
      `SELECT user_id FROM post_comments WHERE id = ?`,
      [commentId],
    )

    if (!comment) {
      return NextResponse.json(
        { message: 'comment not found' },
        { status: 404 },
      )
    }

    if (comment.user_id !== userId) {
      return NextResponse.json({ message: 'forbidden' }, { status: 403 })
    }

    /* ✏️ 댓글 수정 */
    await db.query(`UPDATE post_comments SET content = ? WHERE id = ?`, [
      content,
      commentId,
    ])

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('❌ PUT comment error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: commentId } = await context.params

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)
    const userId = decoded.id

    const [[comment]]: any = await db.query(
      `SELECT user_id FROM post_comments WHERE id = ?`,
      [commentId],
    )

    if (!comment) {
      return NextResponse.json(
        { message: 'comment not found' },
        { status: 404 },
      )
    }

    if (comment.user_id !== userId) {
      return NextResponse.json({ message: 'forbidden' }, { status: 403 })
    }

    /* 🔥 post_id 가져오기 (추가) */
    const [[fullComment]]: any = await db.query(
      `SELECT post_id FROM post_comments WHERE id = ?`,
      [commentId],
    )

    const postId = fullComment.post_id

    /* 대댓글 먼저 삭제 */
    await db.query(
      `UPDATE post_comments SET is_deleted = 1 WHERE parent_id = ?`,
      [commentId],
    )

    /* 본 댓글 삭제 */
    await db.query(`UPDATE post_comments SET is_deleted = 1 WHERE id = ?`, [
      commentId,
    ])

    /* 🔥 댓글 개수 다시 계산 (핵심 추가) */
    await db.query(
      `
  UPDATE posts
  SET commentCount = (
    SELECT COUNT(*) 
    FROM post_comments 
    WHERE post_id = ? AND is_deleted = 0
  )
  WHERE id = ?
  `,
      [postId, postId],
    )

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('❌ DELETE comment error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
