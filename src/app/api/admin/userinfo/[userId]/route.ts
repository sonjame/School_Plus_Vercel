import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

export async function GET(
  req: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    /* ===============================
       1️⃣ params await (🔥 중요)
    =============================== */
    const { userId } = await context.params

    /* ===============================
       2️⃣ 관리자 인증
    =============================== */
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')

    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    if (decoded.level !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    /* ===============================
       3️⃣ 유저 기본 정보
    =============================== */
    const [userRows]: any = await db.query(
      `
      SELECT 
        id,
        username,
        name,
        email,
        school,
        grade,
        class_num,
        provider,
        created_at,
        is_banned,
        banned_reason,
        banned_until
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [userId],
    )

    if (!userRows.length) {
      return NextResponse.json({ message: '유저 없음' }, { status: 404 })
    }

    const user = userRows[0]

    /* ===============================
       4️⃣ 게시글
    =============================== */
    const [posts]: any = await db.query(
      `
  SELECT 
    id, 
    title, 
    content,     -- 🔥 이 줄 추가
    category, 
    created_at, 
    likes, 
    is_hidden
  FROM posts
  WHERE user_id = ?
  ORDER BY created_at DESC
  `,
      [userId],
    )

    /* ===============================
       5️⃣ 댓글
    =============================== */
    const [comments]: any = await db.query(
      `
      SELECT id, post_id, content, created_at, likes, is_hidden
      FROM post_comments
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [userId],
    )

    return NextResponse.json({
      user,
      posts,
      comments,
    })
  } catch (err) {
    console.error('❌ admin user detail error:', err)
    return NextResponse.json({ message: 'Server Error' }, { status: 500 })
  }
}
