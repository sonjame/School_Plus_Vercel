import { NextResponse } from 'next/server'
import { db } from '@/src/lib/db'

/* ==============================
   GET : 사용자 일정 조회
============================== */
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
    description,
    DATE_FORMAT(event_date, '%Y-%m-%d') AS event_date,
    start_time,
    end_time,
    color
  FROM calendar_events
  WHERE user_id = ?
  ORDER BY event_date ASC
      `,
      [Number(userId)]
    )

    return NextResponse.json(rows)
  } catch (e) {
    console.error('❌ GET calendar-events error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}

/* ==============================
   POST : 일정 추가 (단일 날짜)
============================== */
export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      userId,
      title,
      description,
      start_time,
      end_time,
      color,
      event_date,
    } = body

    if (!userId || !title || !event_date) {
      return NextResponse.json({ message: 'missing fields' }, { status: 400 })
    }

    await db.query(
      `
      INSERT INTO calendar_events
        (user_id, title, description, start_time, end_time, color, event_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        Number(userId),
        title,
        description || null,
        start_time || null,
        end_time || null,
        color || null,
        event_date,
      ]
    )

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('❌ POST calendar_events error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}

/* ==============================
   PUT : 일정 수정
============================== */
export async function PUT(req: Request) {
  try {
    const body = await req.json()

    const {
      id, // 🔥 핵심
      userId,
      title,
      description,
      start_time,
      end_time,
      color,
      event_date,
    } = body

    if (!id || !userId || !title || !event_date) {
      return NextResponse.json({ message: 'missing fields' }, { status: 400 })
    }

    await db.query(
      `
      UPDATE calendar_events
      SET
        title = ?,
        description = ?,
        start_time = ?,
        end_time = ?,
        color = ?,
        event_date = ?
      WHERE id = ?
        AND user_id = ?
      `,
      [
        title,
        description || null,
        start_time || null,
        end_time || null,
        color || null,
        event_date,
        Number(id),
        Number(userId),
      ]
    )

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('❌ PUT calendar_events error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}

/* ==============================
   DELETE : 일정 삭제
============================== */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('userId')

    if (!id || !userId) {
      return NextResponse.json({ message: 'missing params' }, { status: 400 })
    }

    await db.query(
      `
      DELETE FROM calendar_events
      WHERE id = ?
        AND user_id = ?
      `,
      [Number(id), Number(userId)]
    )

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('❌ DELETE calendar_events error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
