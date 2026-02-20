import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

/* ==============================
   🔔 관리자 알림 목록
============================== */
export async function GET(req: Request) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth) return NextResponse.json([], { status: 401 })

    const token = auth.replace('Bearer ', '')
    let decoded: any

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch (err) {
      // ⛔ 토큰 만료 / 위조
      return NextResponse.json([], { status: 401 })
    }

    // ✅ 관리자만
    if (decoded.level !== 'admin') {
      return NextResponse.json([], { status: 403 })
    }

    const [rows]: any = await db.query(
      `
  SELECT
    id,
    type,
    title,
    message,
    link,
    is_read,
    created_at
  FROM notifications
  WHERE user_id = ?
    AND type IN (
  'report_post',
  'chat_report',
  'admin_question',
  'admin_post_commented',
  'admin_post_reply',        
  'admin_question_followup',
  'admin_reply',
  'admin_comment_reply',
  'admin_rejoin_requested'
)
  ORDER BY created_at DESC
  LIMIT 50
  `,
      [decoded.id],
    )

    return NextResponse.json(rows)
  } catch (e) {
    console.error('❌ admin notifications error', e)
    return NextResponse.json([], { status: 500 })
  }
}
