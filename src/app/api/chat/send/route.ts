import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const auth = req.headers.get('authorization')
  if (!auth) return NextResponse.json({}, { status: 401 })

  const token = auth.replace('Bearer ', '')
  const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)

  const { roomId, type, content, fileUrl, fileName } = await req.json()

  await db.query(
    `
    INSERT INTO chat_messages
    (room_id, sender_id, type, content, file_url, file_name)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [roomId, decoded.id, type, content, fileUrl, fileName],
  )

  return NextResponse.json({ ok: true })
}
