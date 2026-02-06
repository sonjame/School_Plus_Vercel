import { NextResponse } from 'next/server'
import db from '@/src/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ message: 'userId 필요' }, { status: 400 })
  }

  const [rows]: any = await db.query(
    `
    SELECT id, image_url, created_at
    FROM user_profile_images
    WHERE user_id = ?
    ORDER BY created_at DESC
    `,
    [userId],
  )

  return NextResponse.json(rows)
}
