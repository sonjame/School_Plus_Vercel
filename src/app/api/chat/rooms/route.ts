import db from '@/src/lib/db'
import jwt, { TokenExpiredError } from 'jsonwebtoken'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
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

    /* 2️⃣ DB 조회 */
    const [rows] = await db.query(
      `
SELECT
  r.id,

  /* 🔥 채팅방 이름 자동 계산 */
CASE
  WHEN r.name IS NOT NULL
       AND TRIM(r.name) != ''
       AND r.name NOT IN ('새 그룹 채팅', '1:1 채팅')
    THEN r.name

  WHEN r.is_group = 0 AND r.is_self = 0 THEN (
    SELECT u.name
    FROM chat_room_members rm2
    JOIN users u ON u.id = rm2.user_id
    WHERE rm2.room_id = r.id
      AND rm2.user_id != ?
    LIMIT 1
  )

  WHEN r.is_group = 1 THEN (
    SELECT CONCAT(
      (
        SELECT u2.name
        FROM chat_room_members rm3
        JOIN users u2 ON u2.id = rm3.user_id
        WHERE rm3.room_id = r.id
        ORDER BY rm3.joined_at ASC
        LIMIT 1
      ),
      ' 외에 ',
      (
        SELECT COUNT(*)
        FROM chat_room_members rm4
        WHERE rm4.room_id = r.id
      ) - 1,
      '명'
    )
  )

  ELSE r.name
END AS name,

  r.is_group AS isGroup,
  r.is_self AS isSelf,
(
  SELECT
    CASE
      WHEN m.type = 'image' THEN '사진을 보냈습니다.'
      WHEN m.type = 'file' THEN '파일을 보냈습니다.'
      WHEN m.type = 'poll' THEN '투표를 보냈습니다.'
      WHEN m.type = 'video' THEN '동영상을 보냈습니다.'
      WHEN m.type = 'url' THEN m.content
      WHEN m.type = 'notice' THEN CONCAT('공지: ', m.content)
      ELSE m.content
    END
  FROM chat_messages m
  WHERE m.room_id = r.id
  ORDER BY m.id DESC
  LIMIT 1
) AS lastMessage,

  (
    SELECT COUNT(*)
    FROM chat_messages m
    WHERE m.room_id = r.id
      AND m.sender_id != ?
      AND m.id > COALESCE(rm.last_read_message_id, 0)
      AND m.sender_id NOT IN (
        SELECT blocked_id
        FROM blocks
        WHERE user_id = ?
      )
  ) AS unreadCount

FROM chat_rooms r
JOIN chat_room_members rm
  ON rm.room_id = r.id
WHERE rm.user_id = ?
GROUP BY r.id
ORDER BY
  r.is_self DESC,
  r.id DESC
`,
      [
        userId, // 🔥 1:1 채팅 상대 조회용
        userId, // unreadCount
        userId, // blocks
        userId, // rm.user_id
      ],
    )

    return NextResponse.json(rows)
  } catch (e) {
    console.error('[GET CHAT ROOMS ERROR]', e)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
