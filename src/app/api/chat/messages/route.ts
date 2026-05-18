import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt, { TokenExpiredError } from 'jsonwebtoken'

export async function POST(req: Request) {
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

    /* 2️⃣ body */
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ message: 'INVALID_JSON' }, { status: 400 })
    }

    const { roomId, type, content, fileUrl, fileName } = body

    const allowedTypes = [
      'text',
      'image',
      'file',
      'url',
      'notice',
      'poll',
      'video',
      'emoji',
    ]

    if (!allowedTypes.includes(type)) {
      return NextResponse.json(
        { message: 'INVALID_MESSAGE_TYPE' },
        { status: 400 },
      )
    }

    const roomIdNum = Number(roomId)
    if (!Number.isFinite(roomIdNum) || !type) {
      return NextResponse.json({ message: 'BAD_REQUEST' }, { status: 400 })
    }

    /* 3️⃣ 학교 코드 검사 (🔥 핵심) */

    // 내 학교
    const [[me]]: any = await db.query(
      `SELECT school_code FROM users WHERE id = ?`,
      [userId],
    )

    if (!me) {
      return NextResponse.json({ message: 'USER_NOT_FOUND' }, { status: 404 })
    }

    // 채팅방에 속한 다른 사람의 학교 (나 제외)
    const [[other]]: any = await db.query(
      `
  SELECT u.school_code
  FROM chat_room_members rm
  JOIN users u ON rm.user_id = u.id
  WHERE rm.room_id = ?
    AND rm.user_id != ?
  LIMIT 1
  `,
      [roomIdNum, userId],
    )

    // 상대가 없으면(혼자 있는 방) 통과
    if (other && other.school_code !== me.school_code) {
      return NextResponse.json(
        { message: '학교가 달라져 더 이상 이 채팅을 보낼 수 없습니다.' },
        { status: 403 },
      )
    }

    /* =========================
 🚫 채팅 정지 검사 (기간 정지)
========================= */

    const [[banInfo]]: any = await db.query(
      `
  SELECT is_banned, banned_at, banned_reason
  FROM users
  WHERE id = ?
  `,
      [userId],
    )

    // 영구 정지는 여기 오지도 않음 (로그인 불가)
    // 기간 정지 체크
    if (banInfo?.banned_at) {
      const bannedAt = new Date(banInfo.banned_at)
      const now = new Date()

      // 정지 기간 계산 (reason 기반)
      let banEnd: Date | null = null

      if (banInfo.banned_reason?.includes('24')) {
        banEnd = new Date(bannedAt.getTime() + 24 * 60 * 60 * 1000)
      } else if (banInfo.banned_reason?.includes('72')) {
        banEnd = new Date(bannedAt.getTime() + 72 * 60 * 60 * 1000)
      } else if (banInfo.banned_reason?.includes('7')) {
        banEnd = new Date(bannedAt.getTime() + 7 * 24 * 60 * 60 * 1000)
      }

      if (banEnd && now < banEnd) {
        return NextResponse.json(
          {
            message: 'CHAT_BANNED',
            banEnd,
          },
          { status: 403 },
        )
      }
    }

    /* =========================
    🚫 1:1 채팅 차단 검사 (⭐ 여기!)
    ========================= */

    // 채팅방 멤버 확인
    const [members]: any = await db.query(
      `
  SELECT user_id
  FROM chat_room_members
  WHERE room_id = ?
  `,
      [roomIdNum],
    )

    // 1:1 채팅일 때만 검사
    if (Array.isArray(members) && members.length === 2) {
      const otherUserId =
        members[0].user_id === userId ? members[1].user_id : members[0].user_id

      // 상대가 나를 차단했는지
      const [blocked]: any = await db.query(
        `
    SELECT 1
    FROM blocks
    WHERE user_id = ?      -- 상대
      AND blocked_id = ?   -- 나
    LIMIT 1
    `,
        [otherUserId, userId],
      )

      if (blocked.length > 0) {
        return NextResponse.json(
          { message: '상대방이 나를 차단하여 메시지를 보낼 수 없습니다.' },
          { status: 403 },
        )
      }
    }

    /* 4️⃣ 메시지 저장 */
    await db.query(
      `
  INSERT INTO chat_messages
  (room_id, sender_id, type, content, file_url, file_name)
  VALUES (?, ?, ?, ?, ?, ?)
  `,
      [
        roomIdNum,
        userId,
        type,
        content ?? null,
        fileUrl ?? null,
        fileName ?? null,
      ],
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[SEND MESSAGE ERROR]', e)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
