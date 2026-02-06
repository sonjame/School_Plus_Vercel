import { NextResponse } from 'next/server'
import db from '@/src/lib/db' // mysql2/promise pool
import fetch from 'node-fetch'

type NeisSchoolScheduleResponse = {
  SchoolSchedule?: Array<{
    head?: unknown[]
    row?: Array<{
      AA_YMD: string
      EVENT_NM: string
    }>
  }>
}

export async function GET(req: Request) {
  if (!process.env.NEIS_API_KEY) {
    console.error('❌ NEIS_API_KEY missing')
    return NextResponse.json(
      { message: 'NEIS_API_KEY missing' },
      { status: 500 },
    )
  }

  const { searchParams } = new URL(req.url)

  const eduCode = searchParams.get('eduCode')
  const schoolCode = searchParams.get('schoolCode')
  const year = searchParams.get('year')
  const month = searchParams.get('month')

  if (!eduCode || !schoolCode || !year || !month) {
    return NextResponse.json({ message: 'missing params' }, { status: 400 })
  }

  const m = month.padStart(2, '0')
  const from = `${year}-${m}-01`

  // 🔥 해당 월의 실제 마지막 날 계산
  const lastDay = new Date(Number(year), Number(month), 0).getDate()
  const to = `${year}-${m}-${String(lastDay).padStart(2, '0')}`

  // 1️⃣ DB 조회
  const [rows] = await db.query(
    `
    SELECT 
      DATE_FORMAT(event_date, '%Y-%m-%d') AS date,
      title
    FROM academic_events
    WHERE edu_code = ?
      AND school_code = ?
     AND event_date BETWEEN ? AND ?
    `,
    [eduCode, schoolCode, from, to],
  )

  if ((rows as any[]).length > 0) {
    return NextResponse.json(rows)
  }

  // 2️⃣ NEIS 호출
  const neisFrom = from.replaceAll('-', '')
  const neisTo = to.replaceAll('-', '')

  const url =
    `https://open.neis.go.kr/hub/SchoolSchedule` +
    `?KEY=${process.env.NEIS_API_KEY}` +
    `&Type=json` +
    `&ATPT_OFCDC_SC_CODE=${eduCode}` +
    `&SD_SCHUL_CODE=${schoolCode}` +
    `&AA_FROM_YMD=${neisFrom}` +
    `&AA_TO_YMD=${neisTo}`

  const res = await fetch(url)
  const json = (await res.json()) as NeisSchoolScheduleResponse

  const rowsFromNeis = json?.SchoolSchedule?.[1]?.row ?? []

  if (rowsFromNeis.length === 0) return NextResponse.json([])

  // 3️⃣ DB 저장
  const values = rowsFromNeis.map((r: any) => [
    eduCode,
    schoolCode,
    `${r.AA_YMD.slice(0, 4)}-${r.AA_YMD.slice(4, 6)}-${r.AA_YMD.slice(6, 8)}`,
    r.EVENT_NM,
  ])

  await db.query(
    `
    INSERT IGNORE INTO academic_events
      (edu_code, school_code, event_date, title)
    VALUES ?
    `,
    [values],
  )

  // 4️⃣ 반환
  return NextResponse.json(values.map((v) => ({ date: v[2], title: v[3] })))
}
