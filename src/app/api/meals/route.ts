import { NextResponse } from 'next/server'
import db from '@/src/lib/db'

// NEIS 호출 함수 (지금 쓰는 로직 거의 그대로)
async function fetchMealFromNEIS(
  date: string,
  eduCode: string,
  schoolCode: string,
) {
  const key = process.env.NEXT_PUBLIC_NEIS_KEY
  const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${key}&Type=json&ATPT_OFCDC_SC_CODE=${eduCode}&SD_SCHUL_CODE=${schoolCode}&MLSV_YMD=${date}`

  const res = await fetch(url)
  const data = await res.json()

  const rows = data.mealServiceDietInfo?.[1]?.row
  if (!rows) return null

  const lunch = rows.find((r: any) => r.MMEAL_SC_NM === '중식')
  if (!lunch) return null

  return lunch.DDISH_NM.split('<br/>')
    .map((v: string) =>
      v
        .replace(/[\u2460-\u2473]/g, '')
        .replace(/\(\s?[0-9.]+\s?\)/g, '')
        .trim(),
    )
    .filter(Boolean)
}

// GET /api/meals?date=20260320&eduCode=J10&schoolCode=7580167
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const date = searchParams.get('date') // YYYYMMDD
  const eduCode = searchParams.get('eduCode')
  const schoolCode = searchParams.get('schoolCode')

  if (!date || !eduCode || !schoolCode) {
    return NextResponse.json({ meal: null }, { status: 400 })
  }

  const mysqlDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`

  // 1️⃣ DB 먼저 조회
  const [rows]: any = await db.query(
    `SELECT menu FROM meals
     WHERE school_code=? AND meal_date=? AND meal_type='중식'`,
    [schoolCode, mysqlDate],
  )

  if (rows.length > 0) {
    return NextResponse.json({ meal: JSON.parse(rows[0].menu) })
  }

  // 2️⃣ 없으면 NEIS 호출
  const meal = await fetchMealFromNEIS(date, eduCode, schoolCode)
  if (!meal) {
    return NextResponse.json({ meal: null })
  }

  // 3️⃣ DB 저장
  await db.query(
    `INSERT INTO meals (school_code, edu_code, meal_date, menu)
     VALUES (?, ?, ?, ?)`,
    [schoolCode, eduCode, mysqlDate, JSON.stringify(meal)],
  )

  return NextResponse.json({ meal })
}
