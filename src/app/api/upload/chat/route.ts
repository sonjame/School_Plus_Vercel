import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'NO_FILE' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // 🔐 안전한 파일명
  const ext = file.name.split('.').pop()
  const safeName = crypto.randomUUID()

  // ✅ 채팅 전용 폴더
  const key = `upload/chat/${Date.now()}-${safeName}.${ext}`

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      // ❌ ACL 절대 넣지 말 것
    }),
  )

  return NextResponse.json({
    url: `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`,
    name: file.name,
  })
}
