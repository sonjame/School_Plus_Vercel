import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ message: 'NO_TOKEN' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')
    const { id: userId } = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number
    }

    const body = await req.json()
    const { roomId, content } = body

    if (!roomId || !content?.trim()) {
      return NextResponse.json({ message: 'BAD_REQUEST' }, { status: 400 })
    }

    /* =========================
       1️⃣ 채팅방 멤버인지 확인
    ========================= */
    const [[member]]: any = await db.query(
      `
      SELECT 1
      FROM chat_room_members
      WHERE room_id = ? AND user_id = ?
      `,
      [roomId, userId],
    )

    if (!member) {
      return NextResponse.json({ message: 'FORBIDDEN' }, { status: 403 })
    }

    /* =========================
       🔥 2️⃣ 학교 코드 검사 (전학 차단)
    ========================= */

    // 내 학교
    const [[me]]: any = await db.query(
      `SELECT school_code FROM users WHERE id = ?`,
      [userId],
    )

    if (!me) {
      return NextResponse.json({ message: 'USER_NOT_FOUND' }, { status: 404 })
    }

    // 채팅방의 다른 참여자 학교 (나 제외)
    const [[other]]: any = await db.query(
      `
      SELECT u.school_code
      FROM chat_room_members rm
      JOIN users u ON rm.user_id = u.id
      WHERE rm.room_id = ?
        AND rm.user_id != ?
      LIMIT 1
      `,
      [roomId, userId],
    )

    // 학교 다르면 차단
    if (other && other.school_code !== me.school_code) {
      return NextResponse.json(
        {
          message: '학교가 달라져 이 채팅방에는 공지를 작성할 수 없습니다.',
        },
        { status: 403 },
      )
    }

    /* =========================
       3️⃣ 공지 저장
    ========================= */
    await db.query(
      `
      INSERT INTO chat_messages (room_id, sender_id, type, content)
      VALUES (?, ?, 'notice', ?)
      `,
      [roomId, userId, content.trim()],
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[NOTICE ERROR]', e)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
