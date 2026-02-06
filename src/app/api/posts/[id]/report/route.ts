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
    if (!auth) {
      return NextResponse.json({ message: 'unauthorized' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)
    const userId = decoded.id

    // 🚫 관리자는 신고 불가
    if (decoded.level === 'admin') {
      return NextResponse.json(
        { message: '관리자는 신고할 수 없습니다.' },
        { status: 403 },
      )
    }

    const [[user]]: any = await db.query(
      `
  SELECT
    is_banned,
    banned_at,
    banned_reason
  FROM users
  WHERE id = ?
  `,
      [userId],
    )

    /* 🔴 영구 정지 */
    if (user?.is_banned) {
      return NextResponse.json(
        { message: '영구 정지된 계정입니다.' },
        { status: 403 },
      )
    }

    /* 🟡 기간 정지 */
    if (user?.banned_at) {
      const bannedAt = new Date(user.banned_at).getTime()
      const now = Date.now()

      // ⏱ 정지 기간 설정 (ms)
      const BAN_24H = 24 * 60 * 60 * 1000
      const BAN_72H = 72 * 60 * 60 * 1000
      const BAN_7D = 7 * 24 * 60 * 60 * 1000

      let banDuration = 0
      let banLabel = ''

      // 🔥 사유 또는 정책에 따라 기간 결정
      switch (user.banned_reason) {
        case '24h':
          banDuration = BAN_24H
          banLabel = '24시간'
          break
        case '72h':
          banDuration = BAN_72H
          banLabel = '72시간'
          break
        case '7d':
          banDuration = BAN_7D
          banLabel = '7일'
          break
        default:
          banDuration = BAN_24H
          banLabel = '24시간'
      }

      if (now < bannedAt + banDuration) {
        const remainMs = bannedAt + banDuration - now
        const remainHours = Math.ceil(remainMs / (60 * 60 * 1000))

        return NextResponse.json(
          {
            message: `${banLabel} 정지된 계정입니다.`,
            remainHours,
          },
          { status: 403 },
        )
      }
    }

    const { type, content } = await req.json()

    if (!type) {
      return NextResponse.json(
        { message: '신고 유형이 필요합니다.' },
        { status: 400 },
      )
    }

    /* 🚫 본인 게시글 신고 방지 */
    const [[post]]: any = await db.query(
      `
    SELECT
      user_id,
      title,
      category
      FROM posts
    WHERE id = ?
    `,
      [postId],
    )

    if (post?.user_id === userId) {
      return NextResponse.json(
        { message: '본인 게시글은 신고할 수 없습니다.' },
        { status: 400 },
      )
    }

    /* 🔥 [1] 이미 신고했는지 확인 */
    const [exists]: any = await db.query(
      `
      SELECT id
      FROM post_reports
      WHERE post_id = ? AND user_id = ?
      LIMIT 1
      `,
      [postId, userId],
    )

    if (exists.length > 0) {
      return NextResponse.json(
        { message: '이미 신고한 게시글입니다.' },
        { status: 409 },
      )
    }

    /* 🔥 [2] 신고 등록 */
    await db.query(
      `
      INSERT INTO post_reports (post_id, user_id, type, content)
      VALUES (?, ?, ?, ?)
      `,
      [postId, userId, type, content || null],
    )
    /* =========================
    🔔 관리자 신고 알림 생성 (⭐ 추가)
    ========================= */
    const [admins]: any = await db.query(`
  SELECT id FROM users WHERE level = 'admin'
`)

    if (admins.length > 0) {
      const targetLabel =
        post.category === 'admin' ? '관리자 게시판' : '일반 게시판'

      const link =
        post.category === 'admin' ? '/board/admin' : `/board/post/${postId}`

      const values = admins.map((a: any) => [
        a.id,
        'report_post',
        '🚨 게시글 신고 접수',
        `[${targetLabel}] "${post.title}" 게시글이 신고되었습니다. (사유: ${type})`,
        link,
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

    /* 🔥 [3] 신고 누적 수 확인 */
    const [[{ cnt }]]: any = await db.query(
      `
      SELECT COUNT(*) AS cnt
      FROM post_reports
      WHERE post_id = ?
      `,
      [postId],
    )

    /* 🔥 [4] 3회 이상이면 자동 블라인드 */
    if (cnt >= 3) {
      await db.query(
        `
        UPDATE posts
        SET is_hidden = 1
        WHERE id = ?
        `,
        [postId],
      )
    }

    return NextResponse.json({
      success: true,
      autoHidden: cnt >= 3, // 프론트에서 쓰고 싶으면 사용 가능
    })
  } catch (e) {
    console.error('❌ report error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
