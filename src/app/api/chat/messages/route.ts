import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt, { TokenExpiredError } from 'jsonwebtoken'

export async function POST(req: Request) {
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

    /* 2️⃣ body */
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ message: 'INVALID_JSON' }, { status: 400 })
    }

    const { roomId, type, content, fileUrl, fileName } = body

    const roomIdNum = Number(roomId)
    if (!Number.isFinite(roomIdNum) || !type) {
      return NextResponse.json({ message: 'BAD_REQUEST' }, { status: 400 })
    }

    /* 3️⃣ 메시지 저장 */
    await db.query(
      `
      INSERT INTO chat_messages
      (room_id, sender_id, type, content, file_url, file_name)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        roomIdNum,
        userId,
        type,
        content ?? null,
        fileUrl ?? null,
        fileName ?? null,
      ],
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[SEND MESSAGE ERROR]', e)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
