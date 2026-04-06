// app/api/exam-cutoffs/route.ts

import db from '@/src/lib/db'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const year = searchParams.get('year')
    const grade = searchParams.get('grade')
    const month = searchParams.get('month')

    if (!year || !grade || !month) {
      return NextResponse.json([], { status: 400 })
    }

    const [rows]: any = await db.query(
      `
      SELECT * FROM exam_cutoffs
      WHERE year = ? AND grade = ? AND month = ?
    `,
      [year, grade, month],
    )

    // 🔥 핵심 변환
    const result = rows.flatMap((row: any) => {
      const list = []

      for (let i = 1; i <= 8; i++) {
        const score = row[`grade${i}`]
        if (score !== null) {
          list.push({
            subject: row.subject,
            grade_level: i,
            min_score: score,
          })
        }
      }

      return list
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error(err)
    return NextResponse.json([], { status: 500 })
  }
}
