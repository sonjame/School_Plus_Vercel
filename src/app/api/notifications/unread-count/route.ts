import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ unreadCount: 0 })
    }

    const token = authHeader.replace('Bearer ', '')
    let decoded: any

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch {
      return NextResponse.json({ unreadCount: 0 })
    }

    const userId = decoded.id

    const [[row]]: any = await db.query(
      `
      SELECT COUNT(*) AS unreadCount
      FROM notifications
      WHERE user_id = ? AND is_read = 0
      `,
      [userId],
    )

    return NextResponse.json({
      unreadCount: Number(row.unreadCount || 0),
    })
  } catch (e) {
    console.error('❌ unread-count error', e)
    return NextResponse.json({ unreadCount: 0 })
  }
}
