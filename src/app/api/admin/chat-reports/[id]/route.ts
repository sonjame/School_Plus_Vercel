import { NextRequest, NextResponse } from 'next/server'
import db from '@/src/lib/db'
import type { RowDataPacket } from 'mysql2'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  type DetailRow = RowDataPacket & {
    id: number
    reason: string
    content: string
    reported_user_id: number
    reported_username: string
    is_banned: number | null
    banned_at: string | null
  }

  const [rows] = await db.query<DetailRow[]>(
    `
  SELECT
    r.id,
    r.reason,

    COALESCE(m.content, s.content) AS content,

    CASE 
      WHEN m.id IS NULL THEN 1 
      ELSE 0 
    END AS is_deleted,

    r.reported_user_id,
    u.username AS reported_username,
    u.is_banned,
    u.banned_at

  FROM chat_reports r

  LEFT JOIN chat_messages m ON m.id = r.message_id   -- 🔥 수정
  LEFT JOIN chat_message_snapshots s ON s.message_id = r.message_id  -- 🔥 추가

  JOIN users u ON u.id = r.reported_user_id

  WHERE r.id = ?
  LIMIT 1
  `,
    [id],
  )

  if (rows.length === 0) {
    return NextResponse.json({ message: '없음' }, { status: 404 })
  }

  return NextResponse.json(rows[0])
}
