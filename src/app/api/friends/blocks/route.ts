import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt, { TokenExpiredError } from 'jsonwebtoken'

export async function GET(req: Request) {
  try {
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

    const [rows]: any = await db.query(
      `
      SELECT blocked_id
      FROM blocks
      WHERE user_id = ?
      `,
      [userId],
    )

    return NextResponse.json(rows)
  } catch (e) {
    console.error('[GET BLOCKS ERROR]', e)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    /* 1️⃣ 토큰 */
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ message: 'NO_TOKEN' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')
    const { id: userId } = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number
    }

    /* 2️⃣ body */
    const { blockedId } = await req.json()

    if (!blockedId || typeof blockedId !== 'number') {
      return NextResponse.json(
        { message: 'blockedId required' },
        { status: 400 },
      )
    }

    if (blockedId === userId) {
      return NextResponse.json(
        { message: '자기 자신은 차단할 수 없습니다.' },
        { status: 400 },
      )
    }

    /* 3️⃣ 이미 차단돼 있는지 확인 */
    const [exists]: any = await db.query(
      `
      SELECT id
      FROM blocks
      WHERE user_id = ? AND blocked_id = ?
      LIMIT 1
      `,
      [userId, blockedId],
    )

    /* =========================
       🚫 이미 차단 → 차단 해제
    ========================= */
    if (exists.length > 0) {
      await db.query(
        `
        DELETE FROM blocks
        WHERE user_id = ? AND blocked_id = ?
        `,
        [userId, blockedId],
      )

      return NextResponse.json({
        ok: true,
        blocked: false,
      })
    }

    /* =========================
       🚫 새로 차단
    ========================= */

    // 1️⃣ 친구 관계 제거 (단방향)
    await db.query(
      `
      DELETE FROM friends
      WHERE user_id = ? AND friend_id = ?
      `,
      [userId, blockedId],
    )

    // 2️⃣ 차단 추가
    await db.query(
      `
      INSERT INTO blocks (user_id, blocked_id)
      VALUES (?, ?)
      `,
      [userId, blockedId],
    )

    return NextResponse.json({
      ok: true,
      blocked: true,
    })
  } catch (e) {
    console.error('[BLOCK TOGGLE ERROR]', e)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
