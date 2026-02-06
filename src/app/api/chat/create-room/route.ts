import db from '@/src/lib/db'
import { NextResponse } from 'next/server'
import jwt, { TokenExpiredError } from 'jsonwebtoken'

export async function POST(req: Request) {
  try {
    /* 1️⃣ 토큰 */
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({}, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')

    let creatorId: number

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: number
      }
      creatorId = decoded.id

      /* ===============================
   🚫 채팅 정지 검사 (방 생성 차단)
=============================== */
      const [[ban]]: any = await db.query(
        `
  SELECT is_banned, banned_at, banned_reason
  FROM users
  WHERE id = ?
  `,
        [creatorId],
      )

      // 🔴 영구 정지
      if (ban?.is_banned) {
        return NextResponse.json(
          {
            message: 'CHAT_BANNED_PERMANENT',
          },
          { status: 403 },
        )
      }

      // 🟡 기간 정지
      if (ban?.banned_at) {
        const bannedAt = new Date(ban.banned_at).getTime()
        const now = Date.now()

        const BAN_MAP: Record<string, number> = {
          '24h': 24 * 60 * 60 * 1000,
          '72h': 72 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
        }

        const duration = BAN_MAP[ban.banned_reason] ?? BAN_MAP['24h']

        if (now < bannedAt + duration) {
          return NextResponse.json(
            {
              message: 'CHAT_BANNED',
              banUntil: bannedAt + duration,
            },
            { status: 403 },
          )
        }
      }
    } catch (e) {
      if (e instanceof TokenExpiredError) {
        return NextResponse.json({ message: 'TOKEN_EXPIRED' }, { status: 401 })
      }

      return NextResponse.json({ message: 'INVALID_TOKEN' }, { status: 401 })
    }

    /* 2️⃣ body */
    const { isGroup, name, userIds = [] } = await req.json()

    /* 🔥 방 만든 사람 포함 + 중복 제거 */
    const memberIds = Array.from(new Set<number>([creatorId, ...userIds]))

    const isSelfChat =
      !isGroup && memberIds.length === 1 && memberIds[0] === creatorId

    /* ===============================
   🔥 나와의 채팅 중복 방지
=============================== */
    if (isSelfChat) {
      const [rows]: any = await db.query(
        `
    SELECT id
    FROM chat_rooms
    WHERE is_self = 1
      AND created_by = ?
    LIMIT 1
    `,
        [creatorId],
      )

      if (rows.length > 0) {
        return NextResponse.json(
          {
            roomId: rows[0].id,
            isSelf: true,
          },
          { status: 200 },
        )
      }
    }

    /* ===============================
   🔥 1:1 채팅 중복 방지 (완성형)
=============================== */
    if (!isGroup && memberIds.length === 2) {
      const [rows]: any = await db.query(
        `
    SELECT r.id
    FROM chat_rooms r
    JOIN chat_room_members m ON r.id = m.room_id
    WHERE r.is_group = 0
      AND m.user_id IN (?, ?)
    GROUP BY r.id
    HAVING COUNT(DISTINCT m.user_id) = 2
    LIMIT 1
    `,
        memberIds,
      )

      if (rows.length > 0) {
        return NextResponse.json(
          {
            message: '이미 해당 사용자와의 1:1 채팅방이 있습니다.',
            roomId: rows[0].id,
          },
          { status: 409 },
        )
      }
    }

    /* ===============================
   🚫 1:1 채팅 차단 검사
=============================== */
    if (!isGroup && memberIds.length === 2) {
      const otherUserId =
        memberIds[0] === creatorId ? memberIds[1] : memberIds[0]

      // 서로 차단 여부 확인 (양방향)
      const [blocked]: any = await db.query(
        `
    SELECT 1
    FROM blocks
    WHERE (user_id = ? AND blocked_id = ?)
       OR (user_id = ? AND blocked_id = ?)
    LIMIT 1
    `,
        [creatorId, otherUserId, otherUserId, creatorId],
      )

      if (blocked.length > 0) {
        return NextResponse.json(
          {
            message: '차단된 사용자와는 1:1 채팅방을 만들 수 없습니다.',
          },
          { status: 403 },
        )
      }
    }

    /* ===============================
       3️⃣ 방 생성
    =============================== */
    const roomName = isSelfChat ? '나와의 채팅' : name
    const isSelfValue = isSelfChat ? 1 : 0

    const [room]: any = await db.query(
      `
  INSERT INTO chat_rooms (is_group, is_self, name, created_by)
  VALUES (?, ?, ?, ?)
  `,
      [isGroup ? 1 : 0, isSelfValue, roomName, creatorId],
    )

    const roomId = room.insertId

    /* 4️⃣ 멤버 추가 */
    for (const uid of memberIds) {
      await db.query(
        `INSERT INTO chat_room_members (room_id, user_id)
         VALUES (?, ?)`,
        [roomId, uid],
      )
    }

    return NextResponse.json({ roomId })
  } catch (e) {
    console.error('[CREATE ROOM ERROR]', e)
    return NextResponse.json({}, { status: 500 })
  }
}
