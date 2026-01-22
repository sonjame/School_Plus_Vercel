// src/app/calendar/page.tsx
import { Suspense } from 'react'
import CalendarClient from './CalendarClient'

export default function CalendarPage() {
  return (
    <Suspense fallback={<div>캘린더 불러오는 중...</div>}>
      <CalendarClient />
    </Suspense>
  )
}
