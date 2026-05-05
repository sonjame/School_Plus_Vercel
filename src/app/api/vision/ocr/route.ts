import { NextResponse } from 'next/server'
import vision from '@google-cloud/vision'
import path from 'path'

export async function POST(req: Request) {
  try {
    const keyFilePath = path.join(
      process.cwd(),
      'credentials',
      'vision-key.json',
    )

    const client = new vision.ImageAnnotatorClient({
      keyFilename: keyFilePath,
    })

    const formData = await req.formData()
    const file = formData.get('image')

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: '이미지 파일이 없습니다' },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const [result] = await client.textDetection({
      image: { content: buffer },
    })

    const text = result.fullTextAnnotation?.text ?? ''

    const words =
      result.textAnnotations?.slice(1).map((item) => {
        const vertices = item.boundingPoly?.vertices ?? []

        const xs = vertices
          .map((v) => v.x ?? 0)
          .filter((v) => typeof v === 'number')

        const ys = vertices
          .map((v) => v.y ?? 0)
          .filter((v) => typeof v === 'number')

        const x = Math.min(...xs)
        const y = Math.min(...ys)
        const maxX = Math.max(...xs)
        const maxY = Math.max(...ys)

        return {
          text: item.description ?? '',
          x,
          y,
          width: maxX - x,
          height: maxY - y,
        }
      }) ?? []

    return NextResponse.json({
      text,
      words,
    })
  } catch (err) {
    console.error('Vision OCR Error:', err)
    return NextResponse.json(
      { error: 'OCR 처리 중 오류 발생' },
      { status: 500 },
    )
  }
}
