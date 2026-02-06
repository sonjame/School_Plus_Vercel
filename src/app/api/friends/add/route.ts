import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt, { TokenExpiredError } from 'jsonwebtoken'

export async function POST(req: Request) {
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

    /* 2️⃣ body */
    const { friendId } = await req.json()

    if (!friendId || typeof friendId !== 'number') {
      return NextResponse.json(
        { message: 'friendId is required' },
        { status: 400 },
      )
    }

    if (friendId === userId) {
      return NextResponse.json(
        { message: '자기 자신은 친구로 추가할 수 없습니다.' },
        { status: 400 },
      )
    }

    /* 3️⃣ 이미 친구인지 확인 (단방향) */
    const [exists]: any = await db.query(
      `
  SELECT id
  FROM friends
  WHERE user_id = ?
    AND friend_id = ?
  LIMIT 1
  `,
      [userId, friendId],
    )

    if (exists.length > 0) {
      return NextResponse.json({ message: '이미 친구입니다.' }, { status: 409 })
    }

    /* 4️⃣ 단방향 친구 추가 */
    await db.query(
      `
      INSERT INTO friends (user_id, friend_id)
      VALUES (?, ?)
      `,
      [userId, friendId],
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[ADD FRIEND ERROR]', e)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
