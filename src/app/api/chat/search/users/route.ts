import db from '@/src/lib/db'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const keyword = searchParams.get('name')
    const grade = searchParams.get('grade')
    const classNum = searchParams.get('classNum')
    const schoolCode = searchParams.get('schoolCode')

    if (!schoolCode) {
      return NextResponse.json([])
    }

    let sql = `
      SELECT
        id,
        name,
        username,
        CONCAT(grade, ' ', class_num, '반') AS gradeLabel
      FROM users
      WHERE school_code = ?
    `
    const params: any[] = [schoolCode]

    // 🔹 이름 검색
    if (keyword) {
      sql += ` AND name LIKE ?`
      params.push(`%${keyword}%`)
    }

    // 🔥 학년 / 반 검색 (핵심 수정)
    if (grade && classNum) {
      sql += ` AND grade = ? AND class_num = ?`
      params.push(`${grade}학년`, Number(classNum))
    }

    const [rows] = await db.query(sql, params)
    return NextResponse.json(Array.isArray(rows) ? rows : [])
  } catch (err) {
    console.error('[SEARCH USERS ERROR]', err)
    return NextResponse.json([])
  }
}
