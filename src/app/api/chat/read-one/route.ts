import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ message: 'NO_TOKEN' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number }

    const { roomId, messageId } = await req.json()

    if (!roomId || !messageId) {
      return NextResponse.json({ message: 'BAD_REQUEST' }, { status: 400 })
    }

    await db.query(
      `
      UPDATE chat_room_members
      SET last_read_message_id = GREATEST(
        COALESCE(last_read_message_id, 0),
        ?
      ),
      last_read_at = NOW()
      WHERE user_id = ?
        AND room_id = ?
      `,
      [messageId, decoded.id, roomId],
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('채팅 개별 읽음 처리 실패:', err)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
