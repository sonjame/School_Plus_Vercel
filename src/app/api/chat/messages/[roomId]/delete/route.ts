import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

export async function DELETE(
  req: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await context.params

    // 🔐 인증
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { status: 401 },
      )
    }

    const token = auth.replace('Bearer ', '')
    const { id: userId } = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number
    }

    // 1️⃣ 채팅방 정보 조회
    const [[room]]: any = await db.query(
      `SELECT created_by FROM chat_rooms WHERE id = ?`,
      [roomId],
    )

    if (!room) {
      return NextResponse.json(
        { message: '존재하지 않는 채팅방입니다.' },
        { status: 404 },
      )
    }

    // 2️⃣ 현재 멤버 수 확인
    const [[countRow]]: any = await db.query(
      `
      SELECT COUNT(*) AS memberCount
      FROM chat_room_members
      WHERE room_id = ?
      `,
      [roomId],
    )

    const memberCount = Number(countRow.memberCount)

    // 3️⃣ 방 삭제 가능 조건
    const isOwner = Number(room.created_by) === Number(userId)
    const isLastMember = memberCount <= 1

    if (!isOwner && !isLastMember) {
      return NextResponse.json(
        {
          message:
            '방장은 언제든 삭제할 수 있으며, 일반 멤버는 혼자 남았을 때만 삭제할 수 있습니다.',
        },
        { status: 403 },
      )
    }

    // 4️⃣ 방 삭제 (멤버/메시지는 FK 또는 CASCADE 전제)
    await db.query(`DELETE FROM chat_rooms WHERE id = ?`, [roomId])

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE ROOM ERROR]', e)
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
