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

    let query = `
      SELECT
        p.id,
        p.title,
        p.content,
        p.category,
        p.images,
        p.attachments,
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
    try {
      decoded = jwt.verify(accessToken, process.env.JWT_SECRET!)
    } catch {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userId = decoded.id
    const schoolCode = decoded.school_code

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
        school_code
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
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
      ],
    )

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
