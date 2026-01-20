import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { db } from '@/src/lib/db'

export async function POST(req: Request) {
  try {
    const { refreshToken } = await req.json()

    if (!refreshToken) {
      return NextResponse.json(
        { message: 'Refresh token required' },
        { status: 400 },
      )
    }

    /* =========================
       1️⃣ Refresh JWT 검증
    ========================= */
    const decoded: any = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET!,
    )

    const userId = decoded.id

    /* =========================
       2️⃣ DB에서 refreshToken 유효성 확인
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
        { message: 'Invalid refresh token' },
        { status: 401 },
      )
    }

    /* =========================
       3️⃣ 기존 refreshToken 폐기 (회전)
    ========================= */
    await db.query(`UPDATE refresh_tokens SET revoked = true WHERE token = ?`, [
      refreshToken,
    ])

    /* =========================
       4️⃣ 새 refreshToken 발급 (+30일)
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
       5️⃣ users 테이블에서 school_code 조회 (🔥 핵심)
    ========================= */
    const [userRows]: any = await db.query(
      `SELECT school_code FROM users WHERE id = ?`,
      [userId],
    )

    if (userRows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 })
    }

    const schoolCode = userRows[0].school_code

    /* =========================
       6️⃣ 새 accessToken 발급
    ========================= */
    const newAccessToken = jwt.sign(
      {
        id: userId,
        school_code: schoolCode,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' },
    )

    /* =========================
       7️⃣ 응답
    ========================= */
    return NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    })
  } catch (e) {
    console.error('❌ refresh error:', e)
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
}
