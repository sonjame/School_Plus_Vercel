import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'
import {
  S3Client,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

/* ==============================
   GET : 게시글 상세 조회 (+ 투표)
============================== */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: postId } = await context.params

    /* -------------------------
       로그인 유저 (선택)
    ------------------------- */
    const auth = req.headers.get('authorization')
    let userId: number | null = null
    let decoded: any = null
    let isAdmin = false
    let newAccessToken: string | null = null

    if (auth) {
      const token = auth.replace('Bearer ', '')

      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET!)
      } catch (e) {
        if (e instanceof jwt.TokenExpiredError) {
          const refreshRes = await fetch(
            new URL('/api/auth/refresh', req.url),
            {
              method: 'POST',
              headers: { cookie: req.headers.get('cookie') ?? '' },
            },
          )

          if (refreshRes.ok) {
            newAccessToken =
              refreshRes.headers.get('x-access-token') ||
              (await refreshRes.json()).accessToken

            decoded = jwt.verify(newAccessToken!, process.env.JWT_SECRET!)
          }
        }
      }

      if (decoded) {
        userId = decoded.id
        isAdmin = decoded.level === 'admin'
      }
    }

    /* -------------------------
       게시글 조회
    ------------------------- */
    const [[post]]: any = await db.query(
      `
  SELECT
    p.id,
    p.title,
    p.content,
    p.category,
    p.likes,
    p.images,
    p.attachments,
    p.thumbnail, 
    p.is_hidden,
    DATE_FORMAT(
      CONVERT_TZ(p.created_at, '+00:00', '+09:00'),
      '%Y-%m-%d %H:%i:%s'
    ) AS created_at,
    p.user_id,
    CASE
      WHEN u.level = 'admin' THEN '관리자'
      ELSE COALESCE(u.name, '알 수 없음')
    END AS author
  FROM posts p
  JOIN users u ON p.user_id = u.id
  WHERE p.id = ?
  ${isAdmin ? '' : 'AND p.is_hidden = 0'}
  `,
      [postId],
    )

    if (!post) {
      return NextResponse.json(
        { message: '존재하지 않는 게시글' },
        { status: 404 },
      )
    }

    /* -------------------------
       투표 메타
    ------------------------- */
    const [[voteMeta]]: any = await db.query(
      `
      SELECT DATE_FORMAT(
        CONVERT_TZ(end_at, '+00:00', '+09:00'),
        '%Y-%m-%d %H:%i:%s'
      ) AS end_at
      FROM post_votes
      WHERE post_id = ?
      `,
      [postId],
    )

    let vote = null

    if (voteMeta) {
      const [options]: any = await db.query(
        `
        SELECT 
          o.id AS optionId,
          o.option_text AS text,
          COUNT(l.id) AS votes
        FROM post_vote_options o
        LEFT JOIN post_vote_logs l ON o.id = l.option_id
        WHERE o.post_id = ?
        GROUP BY o.id
        ORDER BY o.id ASC
        `,
        [postId],
      )

      let myVoteIndex: number | null = null

      if (userId) {
        const [[myVote]]: any = await db.query(
          `SELECT option_id FROM post_vote_logs WHERE post_id = ? AND user_id = ?`,
          [postId, userId],
        )

        if (myVote) {
          myVoteIndex = options.findIndex(
            (o: any) => o.optionId === myVote.option_id,
          )
        }
      }

      vote = {
        enabled: true,
        endAt: voteMeta.end_at,
        options,
        myVoteIndex,
      }
    }

    const res = NextResponse.json({
      ...post,
      images:
        typeof post.images === 'string'
          ? JSON.parse(post.images)
          : Array.isArray(post.images)
            ? post.images
            : [],
      attachments:
        typeof post.attachments === 'string'
          ? JSON.parse(post.attachments)
          : Array.isArray(post.attachments)
            ? post.attachments
            : [],
      vote,
    })

    // ⭐ 클라이언트에 재발급된 accessToken 전달
    if (newAccessToken) {
      res.headers.set('x-access-token', newAccessToken)
    }

    return res
  } catch (e) {
    console.error('❌ GET post error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}

/* ==============================
   PUT : 게시글 수정 (+ 투표 재설정)
============================== */
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: postId } = await context.params
    const {
      title,
      content,
      images = [],
      attachments = [],
      thumbnail = null,
      vote,
    } = await req.json()

    // 🔥 link-preview 호출해서 thumbnail 보강 (PUT용)
    const baseUrl = new URL(req.url).origin

    const enrichedAttachments = await Promise.all(
      (attachments ?? []).map(async (a: any) => {
        if (a.type === 'link') {
          try {
            const previewRes = await fetch(
              `${baseUrl}/api/link-preview?url=${encodeURIComponent(a.url)}`,
            )

            if (!previewRes.ok) return a

            const preview = await previewRes.json()

            return {
              ...a,
              thumbnail: preview.image ?? null,
            }
          } catch {
            return a
          }
        }

        return a
      }),
    )

    /* 🔐 인증 */
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

    /* 🔥 BAN 체크 */
    const [[user]]: any = await db.query(
      `SELECT is_banned FROM users WHERE id = ?`,
      [userId],
    )

    if (user?.is_banned) {
      return NextResponse.json(
        { message: '정지된 계정입니다.' },
        { status: 403 },
      )
    }

    /* 🔒 작성자 확인 */

    const isAdmin = decoded.level === 'admin'

    const [[post]]: any = await db.query(
      `SELECT user_id FROM posts WHERE id = ?`,
      [postId],
    )

    if (!post || (post.user_id !== userId && !isAdmin)) {
      return NextResponse.json({ message: 'forbidden' }, { status: 403 })
    }

    /* ==============================
       🔥 temp → posts 이미지 처리
    ============================== */
    const finalImages: string[] = []

    for (const url of images) {
      // 새로 업로드된 temp 이미지
      if (url.includes('/temp/')) {
        const key = url.split('.amazonaws.com/')[1] // temp/xxx.png
        if (!key) continue

        const fileName = key.split('/').pop()
        const newKey = `posts/${postId}/${fileName}`

        // 1️⃣ 복사
        await s3.send(
          new CopyObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET!,
            CopySource: `${process.env.AWS_S3_BUCKET}/${key}`,
            Key: newKey,
          }),
        )

        // 2️⃣ temp 삭제
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET!,
            Key: key,
          }),
        )

        // 3️⃣ 최종 URL
        finalImages.push(
          `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${newKey}`,
        )
      } else {
        // 기존 posts 이미지 → 그대로 유지
        finalImages.push(url)
      }
    }

    function convertYoutubeToThumbnail(url: string | null) {
      if (!url) return null

      const regExp =
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\n?#]+)/

      const match = url.match(regExp)
      const videoId = match?.[1]

      if (!videoId) return url

      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    }

    // 🔥 대표 썸네일 자동 보정 (PUT용)
    let finalThumbnail = thumbnail

    // 1️⃣ 유튜브 변환
    if (finalThumbnail) {
      finalThumbnail = convertYoutubeToThumbnail(finalThumbnail)
    }

    // 2️⃣ 대표설정 안 한 경우 자동 선택
    if (!finalThumbnail) {
      if (finalImages.length > 0) {
        finalThumbnail = finalImages[0]
      } else {
        const firstAttachmentWithThumb = enrichedAttachments.find(
          (a: any) => a.thumbnail,
        )
        finalThumbnail = firstAttachmentWithThumb?.thumbnail ?? null
      }
    }

    /* ==============================
       게시글 수정
    ============================== */
    await db.query(
      `
  UPDATE posts
  SET title = ?, content = ?, images = ?, attachments = ?, thumbnail = ?
  WHERE id = ?
  `,
      [
        title,
        content,
        JSON.stringify(finalImages),
        JSON.stringify(enrichedAttachments ?? []),
        finalThumbnail,
        postId,
      ],
    )

    /* ==============================
       🔥 투표 재설정
    ============================== */
    await db.query(`DELETE FROM post_vote_logs WHERE post_id = ?`, [postId])
    await db.query(`DELETE FROM post_vote_options WHERE post_id = ?`, [postId])
    await db.query(`DELETE FROM post_votes WHERE post_id = ?`, [postId])

    if (vote?.enabled && Array.isArray(vote.options)) {
      await db.query(`INSERT INTO post_votes (post_id, end_at) VALUES (?, ?)`, [
        postId,
        vote.endAt || null,
      ])

      for (const opt of vote.options) {
        await db.query(
          `INSERT INTO post_vote_options (post_id, option_text)
           VALUES (?, ?)`,
          [postId, opt],
        )
      }
    }

    const res = NextResponse.json({ success: true })

    if (newAccessToken) {
      res.headers.set('x-access-token', newAccessToken)
    }

    return res
  } catch (e) {
    console.error('❌ PUT post error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}

/* ==============================
   DELETE : 게시글 삭제
============================== */

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: postId } = await context.params

    const authHeader = req.headers.get('authorization')
    if (!authHeader)
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

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

    /* 🔥 BAN 체크 */
    const [[user]]: any = await db.query(
      `SELECT is_banned FROM users WHERE id = ?`,
      [userId],
    )

    if (user?.is_banned) {
      return NextResponse.json(
        { message: '정지된 계정입니다.' },
        { status: 403 },
      )
    }

    /* 1️⃣ 게시글 + 이미지 조회 */
    const [[post]]: any = await db.query(
      `SELECT user_id, images FROM posts WHERE id = ?`,
      [postId],
    )

    const isAdmin = decoded.level === 'admin'

    if (!post || (post.user_id !== userId && !isAdmin)) {
      return NextResponse.json({ message: 'forbidden' }, { status: 403 })
    }

    /* 2️⃣ images JSON 파싱 */
    let images: string[] = []
    if (post.images) {
      try {
        images =
          typeof post.images === 'string'
            ? JSON.parse(post.images)
            : post.images
      } catch {
        images = []
      }
    }

    /* 3️⃣ S3 이미지 삭제 */
    for (const url of images) {
      const key = (() => {
        try {
          const u = new URL(url)
          return decodeURIComponent(u.pathname.slice(1))
        } catch {
          return null
        }
      })()

      if (!key) continue

      console.log('🧹 S3 DELETE:', key)

      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET!,
          Key: key,
        }),
      )
    }

    /* 4️⃣ DB 정리 */
    await db.query(`DELETE FROM post_vote_logs WHERE post_id = ?`, [postId])
    await db.query(`DELETE FROM post_vote_options WHERE post_id = ?`, [postId])
    await db.query(`DELETE FROM post_votes WHERE post_id = ?`, [postId])
    await db.query(`DELETE FROM post_comments WHERE post_id = ?`, [postId])
    await db.query(`DELETE FROM posts WHERE id = ?`, [postId])

    const res = NextResponse.json({ success: true })

    if (newAccessToken) {
      res.headers.set('x-access-token', newAccessToken)
    }

    return res
  } catch (e) {
    console.error('❌ DELETE post error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
