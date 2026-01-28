import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt, { TokenExpiredError } from 'jsonwebtoken'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

function getS3KeyFromUrl(url: string) {
  try {
    const parsed = new URL(url)
    return decodeURIComponent(parsed.pathname.slice(1))
  } catch {
    return null
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ messageId: string }> },
) {
  try {
    /* 1️⃣ params */
    const { messageId } = await context.params
    const messageIdNum = Number(messageId)

    if (!Number.isFinite(messageIdNum)) {
      return NextResponse.json(
        { message: 'INVALID_MESSAGE_ID' },
        { status: 400 },
      )
    }

    /* 2️⃣ 인증 */
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
    } catch (e) {
      if (e instanceof TokenExpiredError) {
        return NextResponse.json({ message: 'TOKEN_EXPIRED' }, { status: 401 })
      }

      return NextResponse.json({ message: 'INVALID_TOKEN' }, { status: 401 })
    }

    /* 3️⃣ 메시지 조회 */
    const [[msg]]: any = await db.query(
      `
      SELECT id, sender_id, created_at, type, file_url
      FROM chat_messages
      WHERE id = ?
      `,
      [messageIdNum],
    )

    if (!msg) {
      return NextResponse.json({ message: 'NOT_FOUND' }, { status: 404 })
    }

    if (Number(msg.sender_id) !== Number(userId)) {
      return NextResponse.json({ message: 'FORBIDDEN' }, { status: 403 })
    }

    /* 4️⃣ 24시간 계산 */
    const createdAt = new Date(msg.created_at).getTime()
    const diffHours = (Date.now() - createdAt) / (1000 * 60 * 60)

    /* =========================
       ✅ 24시간 이내 → DB + S3 삭제
    ========================= */
    if (diffHours <= 24) {
      if (msg.file_url && (msg.type === 'image' || msg.type === 'file')) {
        const key = getS3KeyFromUrl(msg.file_url)

        if (key) {
          await s3.send(
            new DeleteObjectCommand({
              Bucket: process.env.AWS_S3_BUCKET!,
              Key: key,
            }),
          )
        }
      }

      await db.query(`DELETE FROM chat_messages WHERE id = ?`, [messageIdNum])
      return NextResponse.json({ deleted: 'ALL' })
    }

    /* =========================
       ✅ 24시간 이후 → 본인만 숨김
    ========================= */
    await db.query(
      `
      UPDATE chat_messages
      SET deleted_by = JSON_ARRAY_APPEND(
        COALESCE(deleted_by, JSON_ARRAY()),
        '$',
        ?
      )
      WHERE id = ?
      `,
      [userId, messageIdNum],
    )

    return NextResponse.json({ deleted: 'ME' })
  } catch (e) {
    console.error('[DELETE MESSAGE ERROR]', e)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
