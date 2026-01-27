import { NextResponse } from 'next/server'
import vision from '@google-cloud/vision'

const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(process.env.GOOGLE_VISION_KEY!),
})

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json({ error: '이미지 없음' }, { status: 400 })
    }

    // File → Buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Google Vision OCR
    const [result] = await client.textDetection({
      image: { content: buffer },
    })

    const text = result.fullTextAnnotation?.text ?? ''

    return NextResponse.json({ text })
  } catch (err) {
    console.error('Vision OCR Error:', err)
    return NextResponse.json({ error: 'OCR 실패' }, { status: 500 })
  }
}
