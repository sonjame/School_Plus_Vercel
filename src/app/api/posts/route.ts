import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'

import {
  S3Client,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'

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
    try {
      decoded = jwt.verify(accessToken, process.env.JWT_SECRET!)
    } catch {
      // 🔥 만료 / 위조 → 그냥 401
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const schoolCode = decoded.school_code

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    const isAdmin = decoded.level === 'admin'

    let query = `
 SELECT
  p.id,
  p.title,
  p.content,
  p.category,
  p.images,
  p.attachments,
  CASE
    WHEN u.level = 'admin' THEN '관리자'
    ELSE u.name
  END AS author,
  p.likes,
  COUNT(DISTINCT c.id) AS commentCount,
  DATE_FORMAT(
    CONVERT_TZ(p.created_at, '+00:00', '+09:00'),
    '%Y-%m-%d %H:%i:%s'
  ) AS created_at
FROM posts p
JOIN users u ON p.user_id = u.id
LEFT JOIN post_comments c ON p.id = c.post_id
  WHERE 1=1
`

    const params: any[] = []

    // 🔥 학생만 학교 + 숨김 필터 적용
    if (!isAdmin) {
      if (category !== 'admin') {
        // 🔹 일반 게시판 → 같은 학교 + 숨김 제외
        query += ` AND p.school_code = ? AND p.is_hidden = 0`
        params.push(decoded.school_code)
      } else {
        // 🔥 관리자 게시판 핵심 로직
        query += `
      AND p.is_hidden = 0
      AND (
        u.level = 'admin'         -- 관리자 공지 (전국 공개)
        OR p.school_code = ?      -- 학생 문의 (자기 학교만)
      )
    `
        params.push(decoded.school_code)
      }
    }

    if (category) {
      query += ` AND p.category = ?`
      params.push(category)
    }

    query += `
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `

    const [rows] = await db.query(query, params)

    const parsedRows = (rows as any[]).map((p) => ({
      ...p,
      images:
        typeof p.images === 'string' ? JSON.parse(p.images) : (p.images ?? []),
      attachments:
        typeof p.attachments === 'string'
          ? JSON.parse(p.attachments)
          : (p.attachments ?? []),
    }))

    return NextResponse.json(parsedRows)
  } catch (e) {
    console.error('❌ GET posts error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

/* =========================
   게시글 생성 (+ 이미지 + 투표)
========================= */
export async function POST(req: Request) {
  try {
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

    const userId = decoded.id
    const schoolCode = decoded.school_code

    /* 🔥 BAN 체크 */
    const [[user]]: any = await db.query(
      `SELECT is_banned, banned_at, banned_reason FROM users WHERE id = ?`,
      [userId],
    )

    // 🔴 영구 정지
    if (user?.is_banned) {
      return NextResponse.json(
        { message: '영구 정지된 계정입니다.' },
        { status: 403 },
      )
    }

    // 🟡 기간 정지
    if (user?.banned_at) {
      const bannedAt = new Date(user.banned_at).getTime()
      const now = Date.now()

      const durations: Record<string, number> = {
        '24h': 24 * 60 * 60 * 1000,
        '72h': 72 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
      }

      const duration = durations[user.banned_reason] ?? durations['24h']

      if (now < bannedAt + duration) {
        return NextResponse.json(
          { message: '일시 정지된 계정입니다.' },
          { status: 403 },
        )
      }
    }

    const {
      title,
      content,
      category,
      images = [],
      attachments = [],
      vote,
    } = await req.json()

    if (!title || !content || !category) {
      return NextResponse.json({ message: '필수 값 누락' }, { status: 400 })
    }

    const postId = uuidv4()

    /* ==============================
       🔥 temp → posts 이미지 이동
    ============================== */
    const finalImages: string[] = []

    for (const url of images) {
      if (url.includes('/temp/')) {
        const key = url.split('.amazonaws.com/')[1]
        const fileName = key.split('/').pop()
        const newKey = `posts/${postId}/${fileName}`

        await s3.send(
          new CopyObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET!,
            CopySource: `${process.env.AWS_S3_BUCKET}/${key}`,
            Key: newKey,
          }),
        )

        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET!,
            Key: key,
          }),
        )

        finalImages.push(
          `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${newKey}`,
        )
      } else {
        finalImages.push(url)
      }
    }

    /* ==============================
       게시글 INSERT
    ============================== */
    const authorName = decoded.level === 'admin' ? '관리자' : decoded.name

    await db.query(
      `
  INSERT INTO posts (
    id,
    user_id,
    category,
    title,
    content,
    images,
    attachments,
    likes,
    school_code,
    author
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `,
      [
        postId,
        userId,
        category,
        title,
        content,
        JSON.stringify(finalImages),
        JSON.stringify(attachments ?? []),
        schoolCode,
        authorName,
      ],
    )

    /* ==============================
   🔔 관리자 공지 알림 생성 (⭐ 여기!)
============================== */
    if (category === 'admin' && decoded.level === 'admin') {
      // 🔹 관리자 제외한 전체 사용자
      const [users]: any = await db.query(`
    SELECT id FROM users WHERE level != 'admin'
  `)

      if (users.length > 0) {
        const values = users.map((u: any) => [
          u.id,
          'admin_notice',
          '📢 관리자 공지사항',
          title,
          `/board/post/${postId}`,
        ])

        await db.query(
          `
      INSERT INTO notifications
        (user_id, type, title, message, link)
      VALUES ?
      `,
          [values],
        )
      }
    }

    /* ==============================
   🔔 관리자 문의 알림 생성
============================== */
    if (category === 'admin' && decoded.level !== 'admin') {
      // 🔹 모든 관리자 계정
      const [admins]: any = await db.query(`
    SELECT id FROM users WHERE level = 'admin'
  `)

      if (admins.length > 0) {
        const values = admins.map((a: any) => [
          a.id,
          'admin_question',
          '📩 새 관리자 문의',
          `${decoded.name || '학생'}님이 관리자 문의를 등록했습니다.`,
          `/board/post/${postId}`,
        ])

        await db.query(
          `
      INSERT INTO notifications
        (user_id, type, title, message, link)
      VALUES ?
      `,
          [values],
        )
      }
    }

    /* ==============================
       투표
    ============================== */
    if (vote?.enabled && Array.isArray(vote.options)) {
      await db.query(`INSERT INTO post_votes (post_id, end_at) VALUES (?, ?)`, [
        postId,
        vote.endAt || null,
      ])

      for (const opt of vote.options) {
        await db.query(
          `INSERT INTO post_vote_options (post_id, option_text)
           VALUES (?, ?)`,
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
