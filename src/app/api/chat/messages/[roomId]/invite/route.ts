import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

export async function POST(
  req: Request,
  context: { params: Promise<{ roomId: string }> }, // ⭐ Promise
) {
  // ⭐ 반드시 await
  const { roomId } = await context.params
  const roomIdNum = Number(roomId)

  if (!Number.isFinite(roomIdNum)) {
    return NextResponse.json({ error: 'INVALID_ROOM_ID' }, { status: 400 })
  }

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
       2️⃣ 방 존재 확인
    ========================= */
    const [[room]]: any = await db.query(
      `SELECT id, is_group FROM chat_rooms WHERE id = ?`,
      [roomIdNum],
    )

    if (!room) {
      return NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 })
    }

    /* =========================
       3️⃣ 방 멤버 확인
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
       4️⃣ 초대 유저
    ========================= */
    const body = await req.json()
    const userIds: number[] = Array.isArray(body.userIds) ? body.userIds : []

    if (userIds.length === 0) {
      return NextResponse.json({ error: 'NO_USERS' }, { status: 400 })
    }

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
       5️⃣ 1:1 → 그룹 전환
    ========================= */
    if (!room.is_group) {
      await db.query(`UPDATE chat_rooms SET is_group = 1 WHERE id = ?`, [
        roomIdNum,
      ])
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[INVITE USER ERROR]', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
