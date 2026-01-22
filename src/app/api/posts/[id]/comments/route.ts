import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

/* 댓글 목록 */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: postId } = await context.params

    /* 🔐 로그인 유저 (있으면) */
    let myUserId: number | null = null
    const authHeader = req.headers.get('authorization')
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '')
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)
        myUserId = decoded.id
      } catch {}
    }

    const [rows]: any = await db.query(
      `
  SELECT
    c.id,
    c.content,
    c.author,
    c.parent_id,
    c.user_id,
    c.created_at,

    COUNT(cl.id) AS likes,
    MAX(cl.user_id = ?) AS likedByMe

  FROM post_comments c
  LEFT JOIN comment_likes cl ON c.id = cl.comment_id
  WHERE c.post_id = ?
  GROUP BY
    c.id,
    c.content,
    c.author,
    c.parent_id,
    c.user_id,
    c.created_at
  ORDER BY c.created_at ASC
  `,
      [myUserId ?? -1, postId],
    )

    return NextResponse.json(
      rows.map((c: any) => ({
        id: c.id,
        content: c.content,
        author: c.author,
        parent: c.parent_id, // 🔥 여기서 변환
        user_id: c.user_id,
        created_at: c.created_at,
        likes: Number(c.likes),
        likedByMe: !!c.likedByMe,
      })),
    )
  } catch (e) {
    console.error('❌ GET comments error', e)
    return NextResponse.json([], { status: 500 })
  }
}

/* 댓글 작성 */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: postId } = await context.params
    const { content, parent } = await req.json()

    if (!content) {
      return NextResponse.json({ message: 'content required' }, { status: 400 })
    }

    /* 🔐 JWT 인증 */
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded: any = require('jsonwebtoken').verify(
      token,
      process.env.JWT_SECRET!,
    )

    const userId = decoded.id

    /* 🔥 유저 실명 조회 */
    const [[user]]: any = await db.query(
      `SELECT name FROM users WHERE id = ?`,
      [userId],
    )

    if (!user) {
      return NextResponse.json({ message: 'user not found' }, { status: 404 })
    }

    const author = user.name
    const id = crypto.randomUUID()

    await db.query(
      `
  INSERT INTO post_comments
    (id, post_id, user_id, author, content, parent_id)
  VALUES (?, ?, ?, ?, ?, ?)
  `,
      [id, postId, userId, author, content, parent ?? null],
    )

    return NextResponse.json({
      id,
      post_id: postId,
      user_id: userId,
      author,
      content,
      parent,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedUsers: [],
    })
  } catch (e) {
    console.error('❌ POST comment error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
