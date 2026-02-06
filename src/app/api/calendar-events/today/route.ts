import { NextResponse } from 'next/server'
import db from '@/src/lib/db'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ message: 'missing userId' }, { status: 400 })
    }

    const [rows] = await db.query(
      `
      SELECT
        id,
        title,
        start_time,
        end_time,
        color
      FROM calendar_events
      WHERE user_id = ?
        AND event_date = CURDATE()
      ORDER BY start_time ASC
      `,
      [Number(userId)],
    )

    return NextResponse.json({
      count: (rows as any[]).length,
      events: rows,
    })
  } catch (e) {
    console.error('❌ GET today calendar error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
