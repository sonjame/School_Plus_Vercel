import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'

/* =========================
   게시글 조회 (메인용)
========================= */
export async function GET(req: Request) {
  try {
    /* 🔐 JWT 인증 */
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)

    const schoolCode = decoded.school_code

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    const [rows] = await db.query(
      `
      SELECT
        p.id,
        p.title,
        p.content,
        p.category,
        u.name AS author,
        p.likes,
        COUNT(DISTINCT c.id) AS commentCount,
        DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN post_comments c ON p.id = c.post_id
      WHERE p.category = ?
        AND p.school_code = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
      `,
      [category, schoolCode],
    )

    return NextResponse.json(rows)
  } catch (e) {
    console.error('❌ GET posts error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}

/* =========================
   게시글 생성 (+ 이미지 + 투표)
========================= */
export async function POST(req: Request) {
  try {
    /* 🔐 JWT 인증 */
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)

    const userId = Number(decoded.sub)
    const schoolCode = decoded.school_code

    const { title, content, category, images, vote } = await req.json()

    if (!title || !content || !category) {
      return NextResponse.json({ message: '필수 값 누락' }, { status: 400 })
    }

    /* 🔒 졸업생 게시판 글쓰기 권한 체크 */
    if (category === 'graduate') {
      const [[user]]: any = await db.query(
        `SELECT grade FROM users WHERE id = ?`,
        [userId],
      )

      if (!user || user.grade !== '졸업생') {
        return NextResponse.json(
          { message: '졸업생만 게시글을 작성할 수 있습니다.' },
          { status: 403 },
        )
      }
    }

    const postId = uuidv4()

    /* 1️⃣ 게시글 */
    await db.query(
      `
      INSERT INTO posts (
        id, user_id, category, title, content, likes, school_code
      ) VALUES (?, ?, ?, ?, ?, 0, ?)
      `,
      [postId, userId, category, title, content, schoolCode],
    )

    /* 2️⃣ 이미지 */
    if (Array.isArray(images)) {
      for (const url of images) {
        await db.query(
          `INSERT INTO post_images (post_id, image_url) VALUES (?, ?)`,
          [postId, url],
        )
      }
    }

    /* 3️⃣ 투표 */
    if (vote?.enabled && Array.isArray(vote.options)) {
      await db.query(`INSERT INTO post_votes (post_id, end_at) VALUES (?, ?)`, [
        postId,
        vote.endAt || null,
      ])

      for (const opt of vote.options) {
        await db.query(
          `
          INSERT INTO post_vote_options (post_id, option_text, vote_count)
          VALUES (?, ?, 0)
          `,
          [postId, opt.text ?? opt],
        )
      }
    }

    return NextResponse.json({ success: true, id: postId })
  } catch (e) {
    console.error('❌ POST posts error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
