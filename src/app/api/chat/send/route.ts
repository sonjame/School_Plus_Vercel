import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth) return NextResponse.json({}, { status: 401 })

    const token = auth.replace('Bearer ', '')
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)

    const { roomId, type, content, fileUrl, fileName } = await req.json()

    const [result]: any = await db.query(
      `
      INSERT INTO chat_messages
      (room_id, sender_id, type, content, file_url, file_name)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        roomId,
        decoded.id,
        type,
        content ?? null,
        fileUrl ?? null,
        fileName ?? null,
      ],
    )

    const [[message]]: any = await db.query(
      `
      SELECT
        id,
        room_id,
        sender_id,
        type,
        content,
        file_url,
        file_name,
        created_at
      FROM chat_messages
      WHERE id = ?
      `,
      [result.insertId],
    )

    return NextResponse.json(message)
  } catch (e) {
    console.error('[CHAT SEND ERROR]', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
