import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

export async function POST(
  req: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await context.params
  const roomIdNum = Number(roomId)

  try {
    /* =========================
       1️⃣ 로그인 유저 검증
    ========================= */
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ error: 'NO_TOKEN' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number }
    const userId = decoded.id

    /* =========================
       2️⃣ 방 멤버인지 확인 (🔥 FROM 추가)
    ========================= */
    const [[member]]: any = await db.query(
      `
      SELECT 1
      FROM chat_room_members
      WHERE room_id = ? AND user_id = ?
      LIMIT 1
      `,
      [roomIdNum, userId],
    )

    if (!member) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    /* =========================
       3️⃣ 초대할 유저 목록
    ========================= */
    const body = await req.json()
    const userIds: number[] = Array.isArray(body.userIds) ? body.userIds : []

    if (userIds.length === 0) {
      return NextResponse.json({ error: 'NO_USERS' }, { status: 400 })
    }

    /* =========================
       4️⃣ 초대 유저 추가
    ========================= */
    for (const uid of userIds) {
      if (uid === userId) continue

      await db.query(
        `
        INSERT IGNORE INTO chat_room_members (room_id, user_id)
        VALUES (?, ?)
        `,
        [roomIdNum, uid],
      )
    }

    /* =========================
       5️⃣ 1:1 → 그룹 자동 전환
    ========================= */
    await db.query(
      `
      UPDATE chat_rooms
      SET is_group = 1
      WHERE id = ?
      `,
      [roomIdNum],
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[INVITE USER ERROR]', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
