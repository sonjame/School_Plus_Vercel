import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt, { TokenExpiredError } from 'jsonwebtoken'

export async function DELETE(
  req: Request,
  context: { params: Promise<{ friendId: string }> },
) {
  try {
    /* 1️⃣ 토큰 확인 */
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ message: 'NO_TOKEN' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')

    let userId: number
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: number
      }
      userId = decoded.id
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        return NextResponse.json({ message: 'TOKEN_EXPIRED' }, { status: 401 })
      }
      return NextResponse.json({ message: 'INVALID_TOKEN' }, { status: 401 })
    }

    /* 2️⃣ params (🔥 핵심 수정) */
    const { friendId } = await context.params
    const targetId = Number(friendId)

    if (!targetId) {
      return NextResponse.json(
        { message: 'INVALID_FRIEND_ID' },
        { status: 400 },
      )
    }

    /* 3️⃣ 단방향 친구 삭제 */
    await db.query(
      `
      DELETE FROM friends
      WHERE user_id = ? AND friend_id = ?
      `,
      [userId, targetId],
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE FRIEND ERROR]', e)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
