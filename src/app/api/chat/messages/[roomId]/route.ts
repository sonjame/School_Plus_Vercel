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
    m.poll_data AS pollData,
    m.created_at AS createdAt,

    (
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'optionId', v.option_id,
          'count', v.cnt,
          'voters', v.voters
        )
      )
      FROM (
        SELECT
          pv.option_id,
          COUNT(*) AS cnt,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', u.id,
              'name', u.name
            )
          ) AS voters
        FROM chat_polls_votes pv
        JOIN users u ON u.id = pv.user_id
        WHERE pv.message_id = m.id
        GROUP BY pv.option_id
      ) v
    ) AS pollResults,

    (
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', u.id,
          'name', u.name
        )
      )
      FROM chat_room_members rm
      JOIN users u ON u.id = rm.user_id
      WHERE rm.room_id = m.room_id
        AND rm.user_id NOT IN (
          SELECT user_id
          FROM chat_polls_votes
          WHERE message_id = m.id
        )
    ) AS notVotedUsers,

    (
      SELECT option_id
      FROM chat_polls_votes
      WHERE message_id = m.id
        AND user_id = ?
      LIMIT 1
    ) AS myVote,

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

  -- 🔥 핵심: 차단 필터
  LEFT JOIN blocks b
    ON b.user_id = ?
   AND b.blocked_id = m.sender_id

  WHERE m.room_id = ?
    AND b.id IS NULL           -- 🔥 내가 차단한 사람의 메시지 제거

  ORDER BY m.id ASC
  `,
      [
        userId, // myVote
        userId, // blocks.user_id (나)
        roomIdNum,
      ],
    )

    const parsed = (rows as any[]).map((m) => ({
      ...m,

      pollData:
        typeof m.pollData === 'string'
          ? JSON.parse(m.pollData)
          : (m.pollData ?? undefined),

      pollResult:
        typeof m.pollResults === 'string'
          ? JSON.parse(m.pollResults)
          : (m.pollResults ?? []),

      notVotedUsers:
        typeof m.notVotedUsers === 'string'
          ? JSON.parse(m.notVotedUsers)
          : (m.notVotedUsers ?? []),

      closedAt: m.closedAt,
    }))

    return NextResponse.json(parsed)
  } catch (e) {
    console.error('[GET MESSAGES ERROR]', e)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
