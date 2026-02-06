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

    const [rows]: any = await db.query(
      `
  SELECT COUNT(*) AS unreadCount
  FROM chat_room_members crm
  JOIN (
    SELECT room_id, MAX(id) AS lastMessageId
    FROM chat_messages
    GROUP BY room_id
  ) m ON crm.room_id = m.room_id
  JOIN chat_messages cm
    ON cm.id = m.lastMessageId            -- ✅ 마지막 메시지 JOIN
  WHERE crm.user_id = ?
    AND cm.sender_id != ?                 -- ✅ 내가 보낸 메시지 제외
    AND (
      crm.last_read_message_id IS NULL
      OR m.lastMessageId > crm.last_read_message_id
    )
  `,
      [userId, userId],
    )

    return NextResponse.json({
      unreadCount: rows[0]?.unreadCount || 0,
    })
  } catch (e) {
    console.error('[UNREAD COUNT ERROR]', e)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
