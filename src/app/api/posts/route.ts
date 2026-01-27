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

    const accessToken = authHeader.replace('Bearer ', '')
    let decoded: any
    let newAccessToken: string | null = null

    try {
      decoded = jwt.verify(accessToken, process.env.JWT_SECRET!)
    } catch (e) {
      if (e instanceof jwt.TokenExpiredError) {
        const refreshRes = await fetch(new URL('/api/auth/refresh', req.url), {
          method: 'POST',
          headers: {
            cookie: req.headers.get('cookie') ?? '',
          },
        })

        if (!refreshRes.ok) {
          return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        newAccessToken =
          refreshRes.headers.get('x-access-token') ||
          (await refreshRes.json()).accessToken

        if (!newAccessToken) {
          return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        decoded = jwt.verify(newAccessToken, process.env.JWT_SECRET!)
      } else {
        throw e
      }
    }

    const schoolCode = decoded.school_code

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    let query = `
  SELECT
    p.id,
    p.title,
    p.content,
    p.category,
    u.name AS author,
    p.likes,
    COUNT(DISTINCT c.id) AS commentCount,
    DATE_FORMAT(
  CONVERT_TZ(p.created_at, '+00:00', '+09:00'),
  '%Y-%m-%d %H:%i:%s'
) AS created_at

  FROM posts p
  JOIN users u ON p.user_id = u.id
  LEFT JOIN post_comments c ON p.id = c.post_id
  WHERE p.school_code = ?
`

    const params: any[] = [schoolCode]

    if (category) {
      query += ` AND p.category = ?`
      params.push(category)
    }

    query += `
  GROUP BY p.id
  ORDER BY p.created_at DESC
`

    const [rows] = await db.query(query, params)

    const res = NextResponse.json(rows)

    if (newAccessToken) {
      res.headers.set('x-access-token', newAccessToken)
    }

    return res
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

    const accessToken = authHeader.replace('Bearer ', '')
    let decoded: any
    let newAccessToken: string | null = null

    try {
      decoded = jwt.verify(accessToken, process.env.JWT_SECRET!)
    } catch (e) {
      if (e instanceof jwt.TokenExpiredError) {
        // 🔥 refresh 시도
        const refreshRes = await fetch(
          `${process.env.BASE_URL}/api/auth/refresh`,
          {
            method: 'POST',
            headers: {
              cookie: req.headers.get('cookie') ?? '',
            },
          },
        )

        if (!refreshRes.ok) {
          return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        newAccessToken = refreshRes.headers.get('x-access-token')
        if (!newAccessToken) {
          const data = await refreshRes.json()
          newAccessToken = data.accessToken
        }

        if (!newAccessToken) {
          return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        decoded = jwt.verify(newAccessToken, process.env.JWT_SECRET!)
      } else {
        throw e
      }
    }

    const userId = decoded.id
    const schoolCode = decoded.school_code

    if (!schoolCode) {
      return NextResponse.json(
        { message: 'school_code가 토큰에 없습니다. 다시 로그인해주세요.' },
        { status: 401 },
      )
    }

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

    const res = NextResponse.json({ success: true, id: postId })

    if (newAccessToken) {
      res.headers.set('x-access-token', newAccessToken)
    }

    return res
  } catch (e) {
    console.error('❌ POST posts error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
