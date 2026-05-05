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

    await db.query(
      `
  UPDATE chat_room_members crm
  SET last_read_message_id = (
    SELECT COALESCE(MAX(m.id), 0)
    FROM chat_messages m
    WHERE m.room_id = crm.room_id
  ),
  last_read_at = NOW()
  WHERE crm.user_id = ?
  `,
      [decoded.id],
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('채팅 전체 읽음 처리 실패:', err)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
