import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

export async function DELETE(
  req: Request,
  context: { params: Promise<{ noticeId: string }> },
) {
  try {
    const { noticeId } = await context.params
    const noticeIdNum = Number(noticeId)

    if (!Number.isFinite(noticeIdNum)) {
      return NextResponse.json(
        { message: 'INVALID_NOTICE_ID' },
        { status: 400 },
      )
    }

    /* 🔐 인증 */
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ message: 'NO_TOKEN' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')
    const { id: userId } = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number
    }

    /* =========================
 🚫 채팅 정지 검사
========================= */
    const [[banInfo]]: any = await db.query(
      `
  SELECT is_banned, banned_at, banned_reason
  FROM users
  WHERE id = ?
  `,
      [userId],
    )

    /* 🔴 영구 정지 */
    if (banInfo?.is_banned) {
      return NextResponse.json(
        {
          message: 'CHAT_BANNED_PERMANENT',
        },
        { status: 403 },
      )
    }

    /* 🟡 기간 정지 */
    if (banInfo?.banned_at) {
      const bannedAt = new Date(banInfo.banned_at)
      const now = new Date()

      let banEnd: Date | null = null

      if (banInfo.banned_reason?.includes('24')) {
        banEnd = new Date(bannedAt.getTime() + 24 * 60 * 60 * 1000)
      } else if (banInfo.banned_reason?.includes('72')) {
        banEnd = new Date(bannedAt.getTime() + 72 * 60 * 60 * 1000)
      } else if (banInfo.banned_reason?.includes('7')) {
        banEnd = new Date(bannedAt.getTime() + 7 * 24 * 60 * 60 * 1000)
      }

      if (banEnd && now < banEnd) {
        return NextResponse.json(
          {
            message: 'CHAT_BANNED',
            banEnd,
          },
          { status: 403 },
        )
      }
    }

    /* 📢 공지 조회 */
    const [[notice]]: any = await db.query(
      `
  SELECT id, sender_id
  FROM chat_messages
  WHERE id = ?
  `,
      [noticeIdNum],
    )

    if (!notice) {
      return NextResponse.json({ message: 'NOTICE_NOT_FOUND' }, { status: 404 })
    }

    /* 🚫 작성자만 삭제 가능 */
    if (Number(notice.sender_id) !== Number(userId)) {
      return NextResponse.json({ message: 'FORBIDDEN' }, { status: 403 })
    }

    /* 🗑 삭제 */
    await db.query(`DELETE FROM chat_messages WHERE id = ?`, [noticeIdNum])

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE NOTICE ERROR]', e)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
