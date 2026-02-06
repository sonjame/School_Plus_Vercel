'use client'

import { useParams } from 'next/navigation'
import BoardTemplate from '../BoardTemplate'

export default function CategoryPage() {
  const params = useParams<{ category: string }>()
  const category = params?.category

  const boardTitleMap: Record<string, string> = {
    free: '자유게시판',
    promo: '홍보게시판',
    club: '동아리게시판',
    grade1: '1학년게시판',
    grade2: '2학년게시판',
    grade3: '3학년게시판',
    graduate: '졸업생게시판',
    admin: '관리자 게시판',
  }

  if (!category || !boardTitleMap[category]) {
    return <div style={{ padding: 20 }}>존재하지 않는 게시판입니다.</div>
  }

  return <BoardTemplate title={boardTitleMap[category]} category={category} />
}
