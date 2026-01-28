import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt, { TokenExpiredError } from 'jsonwebtoken'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
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

    /* 2️⃣ params (🔥 반드시 await) */
    const { roomId } = await params
    const roomIdNum = Number(roomId)

    if (!Number.isFinite(roomIdNum)) {
      return NextResponse.json({ message: 'INVALID_ROOM_ID' }, { status: 400 })
    }

    /* 3️⃣ 메시지 조회 */
    const [rows] = await db.query(
      `
      SELECT
        m.id,
        m.room_id AS roomId,
        m.sender_id AS senderId,
        u.name AS senderName,
        m.type,
        m.content,
        m.file_url AS fileUrl,
        m.file_name AS fileName,
        m.created_at AS createdAt,

        -- 🔥 안 읽은 사람 수 (모든 사용자 기준)
        (
          SELECT COUNT(*)
          FROM chat_room_members rm
          WHERE rm.room_id = m.room_id
            AND rm.user_id != m.sender_id
            AND (
              rm.last_read_message_id IS NULL
              OR rm.last_read_message_id < m.id
            )
        ) AS readCount

      FROM chat_messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.room_id = ?
      ORDER BY m.id ASC
      `,
      [roomIdNum],
    )

    return NextResponse.json(rows)
  } catch (e) {
    console.error('[GET MESSAGES ERROR]', e)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
