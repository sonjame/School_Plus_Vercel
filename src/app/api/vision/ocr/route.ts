import { NextResponse } from 'next/server'
import vision from '@google-cloud/vision'
import path from 'path'

const client = new vision.ImageAnnotatorClient({
  keyFilename: path.join(process.cwd(), 'credentials/vision-key.json'),
})

export async function POST(req: Request) {
  try {
    // ✅ JSON 말고 FormData로 받아야 함
    const formData = await req.formData()
    const file = formData.get('image') as File

    if (!file) {
      return NextResponse.json({ error: '이미지 없음' }, { status: 400 })
    }

    // File → Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

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
