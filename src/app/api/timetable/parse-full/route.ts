import { NextResponse } from 'next/server'
import vision from '@google-cloud/vision'
import path from 'path'

const client = new vision.ImageAnnotatorClient({
  keyFilename: path.join(process.cwd(), 'credentials/vision-key.json'),
})

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const image = formData.get('image') as File | null

    if (!image) {
      return NextResponse.json(
        { message: '이미지가 없습니다.' },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await image.arrayBuffer())

    const [result] = await client.textDetection({
      image: { content: buffer },
    })

    // 🔥 OCR 전체 원문 (가장 중요)
    console.log('====== OCR FULL TEXT ======')
    console.log(result.fullTextAnnotation?.text)
    console.log('===========================')

    const textAnnotations = result.textAnnotations
    if (!textAnnotations || textAnnotations.length === 0) {
      return NextResponse.json({ candidates: [] })
    }

    /* ===== OCR 파싱 로직 (시간표 전용) ===== */

    const SUBJECTS = [
      '국어',
      '수학',
      '영어',
      '체육',
      '미술',
      '음악',
      '통합과학',
      '한국사',
      '통합사회',
      '기술가정',
      '과학탐구실험',
    ]

    const DAYS = ['월', '화', '수', '목', '금']

    type Word = { text: string; x: number; y: number }

    // 1️⃣ 단어 + 중심 좌표 추출
    const words: Word[] = textAnnotations
      .slice(1)
      .map((t) => {
        if (!t.description || !t.boundingPoly?.vertices) return null
        const v = t.boundingPoly.vertices
        const x = ((v[0].x ?? 0) + (v[1].x ?? 0)) / 2
        const y = ((v[0].y ?? 0) + (v[2].y ?? 0)) / 2
        return { text: t.description, x, y }
      })
      .filter((w): w is Word => w !== null)

    // 2️⃣ 요일 컬럼 계산 (X좌표 5등분)
    if (words.length === 0) {
      return NextResponse.json({ candidates: [] })
    }

    // 🔥 요일 헤더 기준으로 컬럼 잡기
    const dayHeaders = words.filter((w) =>
      ['월요일', '화요일', '수요일', '목요일', '금요일'].includes(w.text),
    )

    // 요일 헤더 중심 X
    const dayXs = dayHeaders.sort((a, b) => a.x - b.x).map((w) => w.x)

    function getDay(x: number) {
      let minDiff = Infinity
      let idx = 0

      dayXs.forEach((dx, i) => {
        const diff = Math.abs(x - dx)
        if (diff < minDiff) {
          minDiff = diff
          idx = i
        }
      })

      return DAYS[idx]
    }

    // 3️⃣ 교시 기준선 (Y좌표)
    // 🔥 교시 라인 추출 (숫자 + 교시 결합)
    const periodLines: { period: number; y: number }[] = []

    for (const w of words) {
      if (!/^[1-9]|10$/.test(w.text)) continue

      const num = Number(w.text)
      if (!num) continue

      // 같은 Y라인에 '교시'가 있는지 찾기
      const hasGyosi = words.find(
        (o) => o.text === '교시' && Math.abs(o.y - w.y) < 10,
      )

      if (hasGyosi) {
        periodLines.push({ period: num, y: w.y })
      }
    }

    periodLines.sort((a, b) => a.y - b.y)

    function getPeriod(y: number) {
      for (let i = 0; i < periodLines.length; i++) {
        const current = periodLines[i]
        const next = periodLines[i + 1]

        if (!next || y < next.y - 20) {
          if (y > current.y - 20) return current.period
        }
      }
      return null
    }

    // 🔥 과목 결합용
    const SUBJECT_PARTS = [
      '국어',
      '수학',
      '영어',
      '체육',
      '미술',
      '음악',
      '통합',
      '과학',
      '탐구',
      '실험',
      '기술',
      '가정',
      '사회',
    ]

    type SubjectWord = { text: string; x: number; y: number }

    // 과목 관련 단어만
    const subjectWords: SubjectWord[] = words.filter((w) =>
      SUBJECT_PARTS.includes(w.text),
    )

    // y → x 순으로 정렬
    subjectWords.sort((a, b) => a.y - b.y || a.x - b.x)

    // 같은 y라인에서 과목 결합
    const mergedSubjects: SubjectWord[] = []
    for (let i = 0; i < subjectWords.length; i++) {
      const w = subjectWords[i]
      const n1 = subjectWords[i + 1]
      const n2 = subjectWords[i + 2]

      // 과학탐구실험
      if (
        n1 &&
        n2 &&
        w.text === '과학' &&
        n1.text === '탐구' &&
        n2.text === '실험' &&
        Math.abs(w.y - n1.y) < 6 &&
        Math.abs(w.y - n2.y) < 6
      ) {
        mergedSubjects.push({ text: '과학탐구실험', x: w.x, y: w.y })
        i += 2
        continue
      }

      // 통합과학 / 기술가정 / 통합사회
      if (
        n1 &&
        Math.abs(w.y - n1.y) < 6 &&
        ((w.text === '통합' && n1.text === '과학') ||
          (w.text === '기술' && n1.text === '가정') ||
          (w.text === '통합' && n1.text === '사회'))
      ) {
        mergedSubjects.push({ text: w.text + n1.text, x: w.x, y: w.y })
        i++
        continue
      }

      // 단일 과목
      if (SUBJECTS.includes(w.text)) {
        mergedSubjects.push(w)
      }
    }

    const firstPeriodY = periodLines[0]?.y ?? 0

    const validSubjects = mergedSubjects.filter((s) => s.y > firstPeriodY + 60)

    type Cell = {
      day: string
      period: number
      words: Word[]
    }

    const cells: Cell[] = []

    for (let p = 0; p < periodLines.length - 1; p++) {
      for (let d = 0; d < dayXs.length; d++) {
        const cellWords = words.filter(
          (w) =>
            w.y > periodLines[p].y + 20 &&
            w.y < periodLines[p + 1].y - 20 &&
            Math.abs(w.x - dayXs[d]) < 120,
        )

        cells.push({
          day: DAYS[d],
          period: periodLines[p].period,
          words: cellWords,
        })
      }
    }

    // 4️⃣ 과목 배치 (중복 제거)
    const map = new Map<string, any>()
    // 4️⃣ 교시별로 과목 묶기
    const byPeriod = new Map<number, SubjectWord[]>()

    for (const s of validSubjects) {
      const period = getPeriod(s.y)
      if (!period) continue

      if (!byPeriod.has(period)) byPeriod.set(period, [])
      byPeriod.get(period)!.push(s)
    }

    // 5️⃣ 각 교시에서 x순으로 정렬 → 월~금 매핑
    const candidates: any[] = []

    for (const [period, subjects] of byPeriod.entries()) {
      // x 좌표 기준 정렬 (왼 → 오른쪽)
      subjects.sort((a, b) => a.x - b.x)

      subjects.slice(0, 5).forEach((s, idx) => {
        candidates.push({
          subject: s.text,
          period,
          day: DAYS[idx],
        })
      })
    }

    console.log('🔥 PERIOD LINES:', periodLines)
    console.log('🔥 MERGED SUBJECTS:', mergedSubjects)
    console.log('🔥 FINAL CANDIDATES:', candidates)

    return NextResponse.json({ candidates })
  } catch (err) {
    console.error('TIMETABLE OCR ERROR:', err)
    return NextResponse.json({ message: '시간표 OCR 실패' }, { status: 500 })
  }
}
