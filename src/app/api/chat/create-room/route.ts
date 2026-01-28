import db from '@/src/lib/db'
import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export async function POST(req: Request) {
  try {
    /* 1️⃣ 토큰 */
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({}, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')
    const { id: creatorId } = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number
    }

    /* 2️⃣ body */
    const { isGroup, name, userIds = [] } = await req.json()

    /* 🔥 방 만든 사람 포함 + 중복 제거 */
    const memberIds = Array.from(new Set<number>([creatorId, ...userIds]))

    /* 3️⃣ 방 생성 */
    const [room]: any = await db.query(
      `INSERT INTO chat_rooms (is_group, name, created_by)
       VALUES (?, ?, ?)`,
      [isGroup, name, creatorId],
    )

    const roomId = room.insertId

    /* 4️⃣ 멤버 추가 */
    for (const uid of memberIds) {
      await db.query(
        `INSERT INTO chat_room_members (room_id, user_id)
         VALUES (?, ?)`,
        [roomId, uid],
      )
    }

    return NextResponse.json({ roomId })
  } catch (e) {
    console.error('[CREATE ROOM ERROR]', e)
    return NextResponse.json({}, { status: 500 })
  }
}
