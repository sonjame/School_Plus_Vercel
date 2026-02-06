import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

/* ==============================
   🔔 알림 목록 조회
============================== */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json([], { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    let decoded: any

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch {
      return NextResponse.json([], { status: 401 })
    }

    const userId = decoded.id

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
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [userId],
    )

    return NextResponse.json(
      rows.map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        isRead: !!n.is_read,
        created_at: n.created_at,
      })),
    )
  } catch (e) {
    console.error('❌ notifications GET error', e)
    return NextResponse.json([], { status: 500 })
  }
}

/* ==============================
   ✅ 알림 읽음 처리
============================== */
export async function PATCH(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ success: false }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    let decoded: any

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch {
      return NextResponse.json({ success: false }, { status: 401 })
    }

    const userId = decoded.id
    const { notificationId } = await req.json()

    if (!notificationId) {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    await db.query(
      `
      UPDATE notifications
      SET is_read = 1
      WHERE id = ? AND user_id = ?
      `,
      [notificationId, userId],
    )

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('❌ notifications PATCH error', e)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
