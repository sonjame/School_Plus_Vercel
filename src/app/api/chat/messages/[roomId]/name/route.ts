import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

export async function PATCH(
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

    const { id: userId } = jwt.verify(
      auth.replace('Bearer ', ''),
      process.env.JWT_SECRET!,
    ) as { id: number }

    const { name } = await req.json()

    if (!name || !name.trim()) {
      return NextResponse.json(
        { message: '채팅방 이름을 입력하세요.' },
        { status: 400 },
      )
    }

    // 🔒 방에 속한 사람만 이름 변경 가능
    const [[member]]: any = await db.query(
      `
      SELECT 1
      FROM chat_room_members
      WHERE room_id = ? AND user_id = ?
      `,
      [roomId, userId],
    )

    if (!member) {
      return NextResponse.json(
        { message: '채팅방 멤버만 이름을 변경할 수 있습니다.' },
        { status: 403 },
      )
    }

    // ✏️ 이름 변경
    await db.query(
      `
      UPDATE chat_rooms
      SET name = ?
      WHERE id = ?
      `,
      [name.trim(), roomId],
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[UPDATE ROOM NAME ERROR]', e)
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
