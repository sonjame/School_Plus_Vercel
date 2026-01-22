import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

/* =========================
   GET : 스크랩 여부 확인
========================= */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: postId } = await context.params

    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ scrapped: false })
    }

    const token = auth.replace('Bearer ', '')
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)
    const userId = decoded.id

    const [[exist]]: any = await db.query(
      `SELECT id FROM post_scraps WHERE post_id = ? AND user_id = ?`,
      [postId, userId],
    )

    return NextResponse.json({ scrapped: !!exist })
  } catch (e) {
    console.error('❌ scrap GET error', e)
    return NextResponse.json({ scrapped: false })
  }
}

/* =========================
   POST : 스크랩 토글
========================= */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: postId } = await context.params

    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ message: 'unauthorized' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)
    const userId = decoded.id

    const [[exist]]: any = await db.query(
      `SELECT id FROM post_scraps WHERE post_id = ? AND user_id = ?`,
      [postId, userId],
    )

    if (exist) {
      await db.query(
        `DELETE FROM post_scraps WHERE post_id = ? AND user_id = ?`,
        [postId, userId],
      )
      return NextResponse.json({ scrapped: false })
    }

    await db.query(`INSERT INTO post_scraps (post_id, user_id) VALUES (?, ?)`, [
      postId,
      userId,
    ])

    return NextResponse.json({ scrapped: true })
  } catch (e) {
    console.error('❌ scrap POST error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
