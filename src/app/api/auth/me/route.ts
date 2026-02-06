import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt, { TokenExpiredError } from 'jsonwebtoken'

export async function GET(req: Request) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ message: 'unauthorized' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')

    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        return NextResponse.json({ message: 'token expired' }, { status: 401 })
      }

      return NextResponse.json({ message: 'invalid token' }, { status: 401 })
    }

    const userId = decoded.id

    const [[user]]: any = await db.query(
      `
    SELECT
      id,
      username,
      profile_image_url,
      is_banned,
      banned_at,
      banned_reason
      FROM users
      WHERE id = ?
    `,
      [userId],
    )

    if (!user) {
      return NextResponse.json({ message: 'not found' }, { status: 404 })
    }

    /* 🔴 영구 정지 */
    if (user.is_banned) {
      return NextResponse.json(
        {
          banned: true,
          type: 'permanent',
          reason: user.banned_reason
            ? `사유: ${user.banned_reason}`
            : '관리자에 의해 계정이 영구 정지되었습니다.',
        },
        { status: 403 },
      )
    }

    /* 🟡 기간 정지 */
    if (user.banned_at) {
      const bannedAt = new Date(user.banned_at).getTime()
      const now = Date.now()

      const BAN_MAP: Record<string, number> = {
        '24h': 24 * 60 * 60 * 1000,
        '72h': 72 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
      }

      const duration = BAN_MAP[user.banned_reason] ?? BAN_MAP['24h']

      if (now < bannedAt + duration) {
        return NextResponse.json(
          {
            banned: true,
            type: 'temporary',
            reason: user.banned_reason
              ? `사유: ${user.banned_reason}`
              : '관리자에 의해 계정이 정지되었습니다.',
            banUntil: bannedAt + duration,
          },
          { status: 403 },
        )
      }
    }

    /* ✅ 정상 유저 */
    return NextResponse.json({
      banned: false,
      user: {
        id: user.id,
        username: user.username,
        profileImageUrl: user.profile_image_url,
      },
    })
  } catch (e) {
    console.error('[AUTH ME ERROR]', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
