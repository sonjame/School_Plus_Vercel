import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

export async function POST(
  req: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ message: 'NO_TOKEN' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number }

    // ✅ Next 15+ 필수
    const { roomId } = await context.params
    const roomIdNum = Number(roomId)

    if (Number.isNaN(roomIdNum)) {
      return NextResponse.json({ message: 'INVALID_ROOM_ID' }, { status: 400 })
    }

    await db.query(
      `DELETE FROM chat_room_members WHERE room_id = ? AND user_id = ?`,
      [roomIdNum, decoded.id],
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[LEAVE ROOM ERROR]', err)
    return NextResponse.json({ message: 'FAILED' }, { status: 500 })
  }
}
