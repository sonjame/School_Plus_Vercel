import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import db from '@/src/lib/db'

export async function POST(req: Request) {
  const auth = req.headers.get('authorization')
  if (!auth) {
    return NextResponse.json({ message: 'NO_TOKEN' }, { status: 401 })
  }

  const { id: userId } = jwt.verify(
    auth.replace('Bearer ', ''),
    process.env.JWT_SECRET!,
  ) as { id: number }

  const { messageId, optionId } = await req.json()

  if (!messageId || !optionId) {
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
    return NextResponse.json({ message: 'INVALID_POLL_DATA' }, { status: 500 })
  }

  /* 3️⃣ 마감 여부 확인 (🔥 핵심) */
  if (pollData.closedAt && new Date(pollData.closedAt) < new Date()) {
    return NextResponse.json({ message: 'POLL_CLOSED' }, { status: 400 })
  }

  /* 4️⃣ optionId 유효성 검사 */
  const validOption = pollData.options?.some((opt: any) => opt.id === optionId)

  if (!validOption) {
    return NextResponse.json({ message: 'INVALID_OPTION' }, { status: 400 })
  }

  /* 5️⃣ 투표 저장 */
  try {
    await db.query(
      `
      INSERT INTO chat_polls_votes (message_id, user_id, option_id)
      VALUES (?, ?, ?)
      `,
      [messageId, userId, optionId],
    )
  } catch {
    // UNIQUE(message_id, user_id) 위반
    return NextResponse.json({ message: 'ALREADY_VOTED' }, { status: 409 })
  }

  return NextResponse.json({ ok: true })
}
