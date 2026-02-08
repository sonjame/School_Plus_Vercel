import { NextResponse } from 'next/server'
import db from '@/src/lib/db'

export async function GET() {
  try {
    const [rows]: any = await db.query(`
SELECT
  id,
  username,
  provider,
  social_id,
  deleted_at,
  rejoin_available_at,
  admin_override
FROM deleted_users
WHERE admin_override = 0
ORDER BY deleted_at DESC

    `)

    return NextResponse.json(rows)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: '목록 조회 실패' }, { status: 500 })
  }
}
