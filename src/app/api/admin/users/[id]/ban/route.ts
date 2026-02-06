import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

/* =================================================
   🔴 POST : 계정 정지 (영구 / 기간)
================================================= */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: userId } = await context.params

    /* 🔐 관리자 인증 */
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ message: 'unauthorized' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)

    if (decoded.level !== 'admin') {
      return NextResponse.json({ message: 'forbidden' }, { status: 403 })
    }

    /* 📥 요청 값 */
    const { type, reason } = await req.json()
    // type: 'permanent' | '24h' | '72h' | '7d'

    /* 🔴 영구 정지 */
    if (type === 'permanent') {
      await db.query(
        `
    UPDATE users
    SET
      is_banned = 1,
      banned_at = NOW(),
      banned_reason = ?
    WHERE id = ?
    `,
        [reason, userId],
      )

      return NextResponse.json({ success: true, status: 'permanent' })
    }

    /* 🟡 기간 정지 */
    const allowed = ['24h', '72h', '7d']
    if (!allowed.includes(type)) {
      return NextResponse.json({ message: 'invalid ban type' }, { status: 400 })
    }

    await db.query(
      `
    UPDATE users
    SET
      is_banned = 0,
      banned_at = NOW(),
      banned_reason = ?
    WHERE id = ?
    `,
      [reason, userId],
    )

    return NextResponse.json({
      success: true,
      status: type,
      reason: reason ?? null,
    })
  } catch (e) {
    console.error('❌ admin user ban error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}

/* =================================================
   🔓 DELETE : 계정 정지 해제
================================================= */
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: userId } = await context.params

    /* 🔐 관리자 인증 */
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ message: 'unauthorized' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)

    if (decoded.level !== 'admin') {
      return NextResponse.json({ message: 'forbidden' }, { status: 403 })
    }

    /* 🔓 정지 해제 */
    await db.query(
      `
      UPDATE users
      SET
        is_banned = 0,
        banned_at = NULL,
        banned_reason = NULL
      WHERE id = ?
      `,
      [userId],
    )

    return NextResponse.json({
      success: true,
      status: 'unbanned',
    })
  } catch (e) {
    console.error('❌ admin user unban error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
