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
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number
    }

    const { messageId } = await req.json()

    if (!messageId) {
      return NextResponse.json({ message: 'BAD_REQUEST' }, { status: 400 })
    }

    /* 1️⃣ 투표 메시지 조회 */
    const [[message]]: any = await db.query(
      `
      SELECT poll_data, type
      FROM chat_messages
      WHERE id = ?
      `,
      [messageId],
    )

    if (!message || message.type !== 'poll') {
      return NextResponse.json({ message: 'NOT_POLL_MESSAGE' }, { status: 400 })
    }

    /* 2️⃣ poll_data 파싱 */
    let pollData: any
    try {
      pollData =
        typeof message.poll_data === 'string'
          ? JSON.parse(message.poll_data)
          : message.poll_data
    } catch {
      return NextResponse.json(
        { message: 'INVALID_POLL_DATA' },
        { status: 500 },
      )
    }

    /* 3️⃣ 마감 여부 확인 (🔥 핵심) */
    if (pollData.closedAt && new Date(pollData.closedAt) < new Date()) {
      return NextResponse.json({ message: 'POLL_CLOSED' }, { status: 400 })
    }

    /* 4️⃣ 투표 취소 */
    await db.query(
      `
      DELETE FROM chat_polls_votes
      WHERE message_id = ? AND user_id = ?
      `,
      [messageId, decoded.id],
    )

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[UNVOTE ERROR]', e)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
