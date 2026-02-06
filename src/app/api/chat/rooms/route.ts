import db from '@/src/lib/db'
import jwt, { TokenExpiredError } from 'jsonwebtoken'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    /* 1️⃣ 토큰 확인 */
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ message: 'NO_TOKEN' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')

    let userId: number

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: number
      }

      userId = decoded.id
    } catch (e) {
      if (e instanceof TokenExpiredError) {
        return NextResponse.json({ message: 'TOKEN_EXPIRED' }, { status: 401 })
      }

      return NextResponse.json({ message: 'INVALID_TOKEN' }, { status: 401 })
    }

    /* 2️⃣ DB 조회 */
    const [rows] = await db.query(
      `
  SELECT
    r.id,
    r.name,
    r.is_group AS isGroup,
    r.is_self AS isSelf, 

    (
      SELECT m.content
      FROM chat_messages m
      WHERE m.room_id = r.id
      ORDER BY m.id DESC
      LIMIT 1
    ) AS lastMessage,

    (
      SELECT COUNT(*)
      FROM chat_messages m
      WHERE m.room_id = r.id
        AND m.sender_id != ?
        AND m.id > COALESCE(rm.last_read_message_id, 0)
        AND m.sender_id NOT IN (
          SELECT blocked_id
          FROM blocks
          WHERE user_id = ?
        )
    ) AS unreadCount

  FROM chat_rooms r
  JOIN chat_room_members rm
    ON rm.room_id = r.id
  WHERE rm.user_id = ?
  ORDER BY
    r.is_self DESC,
    r.id DESC
  `,
      [
        userId, // m.sender_id != ?
        userId, // blocks.user_id = ?
        userId, // rm.user_id = ?
      ],
    )

    return NextResponse.json(rows)
  } catch (e) {
    console.error('[GET CHAT ROOMS ERROR]', e)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
