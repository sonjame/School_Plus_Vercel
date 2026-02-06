import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ message: 'NO_TOKEN' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number }
    const userId = decoded.id

    /* 1️⃣ 안 읽은 메시지 목록 */
    const [messages]: any = await db.query(
      `
  SELECT
    cm.id AS messageId,
    cm.room_id AS roomId,
    cm.sender_id AS senderId,
    u.name AS senderName,
    cm.content,
    cm.created_at AS createdAt
  FROM chat_room_members crm
  JOIN chat_messages cm
    ON cm.room_id = crm.room_id
   AND cm.id > IFNULL(crm.last_read_message_id, 0)
   AND cm.sender_id != crm.user_id
  JOIN users u
    ON u.id = cm.sender_id
  WHERE crm.user_id = ?
  ORDER BY cm.created_at DESC
  LIMIT 10
  `,
      [userId],
    )

    /* 2️⃣ 카운트 */
    const [countRows]: any = await db.query(
      `
      SELECT COUNT(*) AS unreadCount
      FROM chat_room_members crm
      JOIN chat_messages cm
        ON cm.room_id = crm.room_id
       AND cm.id > IFNULL(crm.last_read_message_id, 0)
       AND cm.sender_id != crm.user_id
      WHERE crm.user_id = ?
      `,
      [userId],
    )

    return NextResponse.json({
      unreadCount: countRows[0]?.unreadCount ?? 0,
      messages,
    })
  } catch (err) {
    console.error('[UNREAD CHAT SUMMARY ERROR]', err)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
