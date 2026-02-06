import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

export async function GET(
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

    jwt.verify(auth.replace('Bearer ', ''), process.env.JWT_SECRET!)

    // 👥 채팅방 참여자 (🔥 최신 users 기준)
    const [rows]: any = await db.query(
      `
      SELECT
        u.id,
        u.name,
        u.username,
        u.profile_image_url AS profileImageUrl, -- 🔥 핵심
        CASE
          WHEN u.grade IS NOT NULL AND u.class_num IS NOT NULL
          THEN CONCAT(u.grade, u.class_num, '반')
          ELSE NULL
        END AS gradeLabel,
        CASE
          WHEN u.id = cr.created_by THEN 1
          ELSE 0
        END AS isOwner
      FROM chat_room_members crm
      JOIN users u ON u.id = crm.user_id
      JOIN chat_rooms cr ON cr.id = crm.room_id
      WHERE crm.room_id = ?
      ORDER BY isOwner DESC, u.name ASC
      `,
      [roomId],
    )

    return NextResponse.json(rows)
  } catch (e) {
    console.error('[GET ROOM USERS ERROR]', e)
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
