import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

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

    if (auth) {
      const token = auth.replace('Bearer ', '')
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)
      userId = decoded.id
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
        p.created_at,
        p.user_id,
        COALESCE(u.name, '알 수 없음') AS author
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
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
      `SELECT end_at FROM post_votes WHERE post_id = ?`,
      [postId],
    )

    let vote = null

    if (voteMeta) {
      /* -------------------------
         옵션 + 실제 투표 수 계산
      ------------------------- */
      const [options]: any = await db.query(
        `
        SELECT
          o.id AS optionId,
          o.option_text AS text,
          COUNT(l.id) AS votes
        FROM post_vote_options o
        LEFT JOIN post_vote_logs l
          ON o.id = l.option_id
        WHERE o.post_id = ?
        GROUP BY o.id
        ORDER BY o.id ASC
        `,
        [postId],
      )

      /* -------------------------
         내가 투표한 옵션
      ------------------------- */
      let myVoteIndex: number | null = null

      if (userId) {
        const [[myVote]]: any = await db.query(
          `
          SELECT option_id
          FROM post_vote_logs
          WHERE post_id = ? AND user_id = ?
          `,
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
        myVoteIndex, // ⭐ 핵심
      }
    }

    return NextResponse.json({ ...post, vote })
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
    const { title, content, vote } = await req.json()

    const authHeader = req.headers.get('authorization')
    if (!authHeader)
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)
    const userId = decoded.id

    const [[post]]: any = await db.query(
      `SELECT user_id FROM posts WHERE id = ?`,
      [postId],
    )

    if (!post || post.user_id !== userId)
      return NextResponse.json({ message: 'forbidden' }, { status: 403 })

    /* 게시글 수정 */
    await db.query(`UPDATE posts SET title = ?, content = ? WHERE id = ?`, [
      title,
      content,
      postId,
    ])

    /* 기존 투표 완전 삭제 */
    await db.query(`DELETE FROM post_vote_logs WHERE post_id = ?`, [postId])
    await db.query(`DELETE FROM post_vote_options WHERE post_id = ?`, [postId])
    await db.query(`DELETE FROM post_votes WHERE post_id = ?`, [postId])

    /* 투표 재생성 */
    if (vote?.enabled && Array.isArray(vote.options)) {
      await db.query(`INSERT INTO post_votes (post_id, end_at) VALUES (?, ?)`, [
        postId,
        vote.endAt || null,
      ])

      for (const opt of vote.options) {
        await db.query(
          `
          INSERT INTO post_vote_options (post_id, option_text)
          VALUES (?, ?)
          `,
          [postId, opt],
        )
      }
    }

    return NextResponse.json({ success: true })
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

    const token = authHeader.replace('Bearer ', '')
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)
    const userId = decoded.id

    const [[post]]: any = await db.query(
      `SELECT user_id FROM posts WHERE id = ?`,
      [postId],
    )

    if (!post || post.user_id !== userId)
      return NextResponse.json({ message: 'forbidden' }, { status: 403 })

    await db.query(`DELETE FROM post_vote_logs WHERE post_id = ?`, [postId])
    await db.query(`DELETE FROM post_vote_options WHERE post_id = ?`, [postId])
    await db.query(`DELETE FROM post_votes WHERE post_id = ?`, [postId])
    await db.query(`DELETE FROM comments WHERE post_id = ?`, [postId])
    await db.query(`DELETE FROM posts WHERE id = ?`, [postId])

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('❌ DELETE post error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
