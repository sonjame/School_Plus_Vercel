import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: postId } = await context.params

    const auth = req.headers.get('authorization')
    if (!auth)
      return NextResponse.json({ message: 'unauthorized' }, { status: 401 })

    const token = auth.replace('Bearer ', '')
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)
    const userId = decoded.id

    const [[user]]: any = await db.query(
      `
  SELECT is_banned, banned_until
  FROM users
  WHERE id = ?
  `,
      [userId],
    )

    // 🚫 영구 정지
    if (user?.is_banned) {
      return NextResponse.json(
        { message: '영구 정지된 계정입니다.' },
        { status: 403 },
      )
    }

    // ⏱ 기간 정지
    if (user?.banned_until && new Date(user.banned_until) > new Date()) {
      return NextResponse.json(
        {
          message: `정지된 계정입니다. 해제 시각: ${new Date(
            user.banned_until,
          ).toLocaleString()}`,
        },
        { status: 403 },
      )
    }

    // ⏰ 정지 기간이 지났으면 자동 해제
    if (user?.banned_until && new Date(user.banned_until) <= new Date()) {
      await db.query(
        `
    UPDATE users
    SET banned_until = NULL
    WHERE id = ?
    `,
        [userId],
      )
    }

    const { optionIndex } = await req.json()

    /* ✅ 1. index → option_id 변환 */
    const [options]: any = await db.query(
      `
      SELECT id
      FROM post_vote_options
      WHERE post_id = ?
      ORDER BY id ASC
      `,
      [postId],
    )

    const option = options[optionIndex]
    if (!option)
      return NextResponse.json({ message: 'invalid option' }, { status: 400 })

    const optionId = option.id

    /* ✅ 2. 기존 투표 확인 */
    const [[exist]]: any = await db.query(
      `
      SELECT option_id
      FROM post_vote_logs
      WHERE post_id = ? AND user_id = ?
      `,
      [postId, userId],
    )

    if (exist) {
      // 같은 옵션 → 취소
      if (exist.option_id === optionId) {
        await db.query(
          `
          DELETE FROM post_vote_logs
          WHERE post_id = ? AND user_id = ?
          `,
          [postId, userId],
        )
      } else {
        // 다른 옵션 → 변경
        await db.query(
          `
          UPDATE post_vote_logs
          SET option_id = ?, voted_at = NOW()
          WHERE post_id = ? AND user_id = ?
          `,
          [optionId, postId, userId],
        )
      }
    } else {
      // 최초 투표
      await db.query(
        `
        INSERT INTO post_vote_logs (post_id, user_id, option_id)
        VALUES (?, ?, ?)
        `,
        [postId, userId, optionId],
      )
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('❌ vote error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
