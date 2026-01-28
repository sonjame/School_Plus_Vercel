import db from '@/src/lib/db'
import jwt, { TokenExpiredError } from 'jsonwebtoken'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  try {
    /* 1️⃣ params */
    const { roomId } = await context.params
    const roomIdNum = Number(roomId)

    if (!Number.isFinite(roomIdNum)) {
      return NextResponse.json({ message: 'INVALID_ROOM_ID' }, { status: 400 })
    }

    /* 2️⃣ 토큰 */
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

    /* 3️⃣ 마지막 메시지 ID */
    const [[last]]: any = await db.query(
      `
      SELECT MAX(id) AS lastMessageId
      FROM chat_messages
      WHERE room_id = ?
      `,
      [roomIdNum],
    )

    if (!last?.lastMessageId) {
      return NextResponse.json({ ok: true })
    }

    /* 4️⃣ 읽음 처리 */
    await db.query(
      `
      UPDATE chat_room_members
      SET last_read_message_id = ?
      WHERE room_id = ? AND user_id = ?
      `,
      [last.lastMessageId, roomIdNum, userId],
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[READ MESSAGE ERROR]', err)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
