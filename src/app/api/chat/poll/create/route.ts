import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import db from '@/src/lib/db'

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ message: 'NO_TOKEN' }, { status: 401 })
    }

    const { id: userId } = jwt.verify(
      auth.replace('Bearer ', ''),
      process.env.JWT_SECRET!,
    ) as { id: number }

    const { roomId, title, options, anonymous, closedAt } = await req.json()

    if (!roomId || !title || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json({ message: 'BAD_REQUEST' }, { status: 400 })
    }

    // ✅ 마감 시간 검증
    if (closedAt && isNaN(Date.parse(closedAt))) {
      return NextResponse.json(
        { message: 'INVALID_CLOSED_AT' },
        { status: 400 },
      )
    }

    /* =========================
       1️⃣ 채팅방 멤버 확인
    ========================= */
    const [[member]]: any = await db.query(
      `
      SELECT 1
      FROM chat_room_members
      WHERE room_id = ? AND user_id = ?
      `,
      [roomId, userId],
    )

    if (!member) {
      return NextResponse.json({ message: 'FORBIDDEN' }, { status: 403 })
    }

    /* =========================
       2️⃣ 학교 코드 검사 (🔥 전학 차단)
    ========================= */

    // 내 학교
    const [[me]]: any = await db.query(
      `SELECT school_code FROM users WHERE id = ?`,
      [userId],
    )

    if (!me) {
      return NextResponse.json({ message: 'USER_NOT_FOUND' }, { status: 404 })
    }

    // 채팅방의 다른 사람 학교 (나 제외)
    const [[other]]: any = await db.query(
      `
      SELECT u.school_code
      FROM chat_room_members rm
      JOIN users u ON rm.user_id = u.id
      WHERE rm.room_id = ?
        AND rm.user_id != ?
      LIMIT 1
      `,
      [roomId, userId],
    )

    // 🔥 학교 다르면 투표 생성 차단
    if (other && other.school_code !== me.school_code) {
      return NextResponse.json(
        {
          message:
            '학교가 달라져 더 이상 이 채팅방에서 투표를 만들 수 없습니다.',
        },
        { status: 403 },
      )
    }

    /* =========================
   🚫 1:1 채팅 차단 검사
========================= */

    // 채팅방 멤버 전체 조회
    const [members]: any = await db.query(
      `
  SELECT user_id
  FROM chat_room_members
  WHERE room_id = ?
  `,
      [roomId],
    )

    // 1:1 채팅일 때만 차단 검사
    if (Array.isArray(members) && members.length === 2) {
      const otherUserId =
        members[0].user_id === userId ? members[1].user_id : members[0].user_id

      // 상대가 나를 차단했는지 확인
      const [blocked]: any = await db.query(
        `
    SELECT 1
    FROM blocks
    WHERE user_id = ?      -- 상대
      AND blocked_id = ?   -- 나
    LIMIT 1
    `,
        [otherUserId, userId],
      )

      if (blocked.length > 0) {
        return NextResponse.json(
          {
            message:
              '상대방이 나를 차단하여 이 채팅방에서 투표를 만들 수 없습니다.',
          },
          { status: 403 },
        )
      }
    }

    /* =========================
 🚫 채팅 정지 검사 (통합)
========================= */

    const [[ban]]: any = await db.query(
      `
  SELECT is_banned, ban_until
  FROM users
  WHERE id = ?
  `,
      [userId],
    )

    // 영구 정지 (안전망)
    if (ban?.is_banned) {
      return NextResponse.json(
        { message: 'CHAT_BANNED_PERMANENT' },
        { status: 403 },
      )
    }

    // 기간 정지
    if (ban?.ban_until && new Date(ban.ban_until) > new Date()) {
      return NextResponse.json(
        {
          message: 'CHAT_BANNED',
          banUntil: ban.ban_until,
        },
        { status: 403 },
      )
    }

    /* =========================
       3️⃣ 투표 메시지 저장
    ========================= */
    const pollData = {
      title,
      options: options.map((t: string, i: number) => ({
        id: i + 1,
        text: t,
      })),
      anonymous: Boolean(anonymous),
      closedAt: closedAt ? new Date(closedAt).toISOString() : null,
    }

    await db.query(
      `
      INSERT INTO chat_messages (room_id, sender_id, type, poll_data)
      VALUES (?, ?, 'poll', ?)
      `,
      [roomId, userId, JSON.stringify(pollData)],
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[POLL CREATE ERROR]', e)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
