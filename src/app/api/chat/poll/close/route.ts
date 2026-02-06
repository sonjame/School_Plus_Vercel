import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth) return NextResponse.json({}, { status: 401 })

    const token = auth.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number }

    const { messageId } = await req.json()

    // 작성자만 마감 가능
    const [[msg]]: any = await db.query(
      `SELECT sender_id FROM chat_messages WHERE id = ?`,
      [messageId],
    )

    if (!msg || msg.sender_id !== decoded.id) {
      return NextResponse.json({ message: 'FORBIDDEN' }, { status: 403 })
    }

    await db.query(
      `
      UPDATE chat_messages
      SET closed_at = NOW()
      WHERE id = ?
      `,
      [messageId],
    )

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[CLOSE POLL ERROR]', e)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
