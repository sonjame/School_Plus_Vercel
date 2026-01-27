import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import db from '@/src/lib/db'

function getCookieFromRequest(req: Request, name: string) {
  const cookieHeader = req.headers.get('cookie')
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';').map((c) => c.trim())
  const target = cookies.find((c) => c.startsWith(`${name}=`))
  return target ? decodeURIComponent(target.split('=')[1]) : null
}

export async function POST(req: Request) {
  try {
    /* =========================
       1️⃣ Request에서 refreshToken 읽기
    ========================= */
    const refreshToken = getCookieFromRequest(req, 'refreshToken')

    if (!refreshToken) {
      return NextResponse.json({ code: 'NO_REFRESH_TOKEN' }, { status: 401 })
    }

    /* =========================
       2️⃣ JWT 검증
    ========================= */
    const decoded: any = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET!,
    )
    const userId = decoded.id

    /* =========================
       3️⃣ DB 유효성 검사
    ========================= */
    const [rows]: any = await db.query(
      `
      SELECT * FROM refresh_tokens
      WHERE token = ?
        AND revoked = false
        AND expires_at > NOW()
      `,
      [refreshToken],
    )

    if (rows.length === 0) {
      return NextResponse.json(
        { code: 'INVALID_REFRESH_TOKEN' },
        { status: 401 },
      )
    }

    /* =========================
       4️⃣ 기존 refreshToken 폐기
    ========================= */
    await db.query(`UPDATE refresh_tokens SET revoked = true WHERE token = ?`, [
      refreshToken,
    ])

    /* =========================
       5️⃣ 새 refreshToken 발급
    ========================= */
    const newRefreshToken = jwt.sign(
      { id: userId },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '30d' },
    )

    await db.query(
      `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))
      `,
      [userId, newRefreshToken],
    )

    /* =========================
       6️⃣ 새 accessToken 발급
    ========================= */
    const [userRows]: any = await db.query(
      `SELECT school_code FROM users WHERE id = ?`,
      [userId],
    )

    const newAccessToken = jwt.sign(
      {
        id: userId,
        school_code: userRows[0].school_code,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' },
    )

    /* =========================
       7️⃣ 응답 + 쿠키 갱신
    ========================= */
    const res = NextResponse.json({ ok: true })

    res.headers.set('x-access-token', newAccessToken)

    res.cookies.set('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })

    return res
  } catch (e) {
    if (e instanceof jwt.TokenExpiredError) {
      return NextResponse.json({ code: 'REFRESH_EXPIRED' }, { status: 401 })
    }

    console.error('❌ refresh error:', e)
    return NextResponse.json({ code: 'REFRESH_FAILED' }, { status: 401 })
  }
}
