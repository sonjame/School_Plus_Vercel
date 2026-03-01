import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken' // 🔥 네가 쓰는 토큰 검증 함수
import db from '@/src/lib/db' // 🔥 DB 커넥션 (mysql2 / prisma 등)
import type { RowDataPacket } from 'mysql2'

type AdminRow = RowDataPacket & {
  id: number
}

export async function POST(req: NextRequest) {
  try {
    /* =====================
   1️⃣ 인증 (JWT)
===================== */
    const auth = req.headers.get('authorization')

    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: '인증이 필요합니다.' },
        { status: 401 },
      )
    }

    const token = auth.replace('Bearer ', '')

    let user: { id: number }

    try {
      user = jwt.verify(token, process.env.JWT_SECRET!) as { id: number }
    } catch {
      return NextResponse.json(
        { message: '유효하지 않은 토큰입니다.' },
        { status: 401 },
      )
    }

    /* =====================
       2️⃣ Body 파싱
    ===================== */
    const body = await req.json().catch(() => null)

    if (!body) {
      return NextResponse.json(
        { message: '요청 형식이 올바르지 않습니다.' },
        { status: 400 },
      )
    }

    const { roomId, messageId, reportedUserId, reason } = body

    if (!roomId || !messageId || !reportedUserId || !reason?.trim()) {
      return NextResponse.json(
        { message: '필수 값이 누락되었습니다.' },
        { status: 400 },
      )
    }

    /* =====================
       3️⃣ 자기 자신 신고 방지
    ===================== */
    if (reportedUserId === user.id) {
      return NextResponse.json(
        { message: '자기 자신은 신고할 수 없습니다.' },
        { status: 400 },
      )
    }

    /* =====================
       4️⃣ 중복 신고 방지
    ===================== */
    const [dup] = await db.query(
      `
      SELECT id FROM chat_reports
      WHERE message_id = ? AND reporter_id = ?
      LIMIT 1
      `,
      [messageId, user.id],
    )

    if (Array.isArray(dup) && dup.length > 0) {
      return NextResponse.json(
        { message: '이미 신고한 메시지입니다.' },
        { status: 409 },
      )
    }

    /* =====================
   5️⃣ 메시지 존재 + 방 일치 검증
===================== */
    type MessageRow = RowDataPacket & {
      id: number
      room_id: number
    }

    const [msgRows] = await db.query<MessageRow[]>(
      `
  SELECT id, room_id FROM chat_messages
  WHERE id = ?
  LIMIT 1
  `,
      [messageId],
    )

    if (!Array.isArray(msgRows) || msgRows.length === 0) {
      return NextResponse.json(
        { message: '존재하지 않는 메시지입니다.' },
        { status: 404 },
      )
    }

    if (msgRows[0].room_id !== roomId) {
      return NextResponse.json(
        { message: '잘못된 신고 요청입니다.' },
        { status: 400 },
      )
    }

    /* =====================
   6️⃣ 신고 저장
===================== */
    const [reportResult]: any = await db.query(
      `
  INSERT INTO chat_reports
    (room_id, message_id, reporter_id, reported_user_id, reason)
  VALUES (?, ?, ?, ?, ?)
  `,
      [roomId, messageId, user.id, reportedUserId, reason.trim()],
    )

    const reportId = reportResult.insertId

    /* =====================
   7️⃣ 관리자 알림 생성
===================== */

    type RoomRow = RowDataPacket & { name: string | null }

    const [roomRows] = await db.query<RoomRow[]>(
      `
  SELECT
    CASE
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
    END AS name
  FROM chat_rooms r
  WHERE r.id = ?
  LIMIT 1
  `,
      [user.id, roomId],
    )

    const roomName =
      roomRows.length && roomRows[0].name
        ? roomRows[0].name
        : '알 수 없는 채팅방'

    const [admins] = await db.query<AdminRow[]>(
      `SELECT id FROM users WHERE level = 'admin'`,
    )

    for (const admin of admins) {
      await db.query(
        `
  INSERT INTO notifications
    (user_id, type, title, message, link)
  VALUES (?, ?, ?, ?, ?)
  `,
        [
          admin.id,
          'chat_report',
          '채팅 신고 발생',
          `채팅방 "${roomName}"에서 신고가 접수되었습니다.`,
          `/admin/chat-report/${reportId}`,
        ],
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[CHAT REPORT ERROR]', err)
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
