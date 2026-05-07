'use client'

import { apiFetch } from '@/src/lib/apiFetch'
import { useEffect, useState } from 'react'

type PollMessageProps = {
  msg: any
  currentUser: any
  onRefresh?: () => void
  onDelete?: () => void
  onClose?: () => void
}

export default function PollMessage({
  msg,
  currentUser,
  onRefresh,
  onDelete,
  onClose,
}: PollMessageProps) {
  const poll = msg.pollData
  const results = msg.pollResult ?? []

  const totalVotes = results.reduce((sum: number, r: any) => sum + r.count, 0)

  const isOwner = msg.senderId === currentUser?.id
  const isAnonymous = poll?.anonymous === true

  const isClosed = poll?.closedAt && new Date(poll.closedAt) < new Date()

  const myVote = msg.myVote ?? null

  const closedAt = poll?.closedAt ? new Date(poll.closedAt) : null

  const remainingText = (() => {
    if (!closedAt) return null

    const diff = closedAt.getTime() - Date.now()
    if (diff <= 0) return '마감됨'

    const minutes = Math.floor(diff / 1000 / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}일 ${hours % 24}시간 남음`
    if (hours > 0) return `${hours}시간 ${minutes % 60}분 남음`
    return `${minutes}분 남음`
  })()

  /* ======================
     투표
  ====================== */
  const handleVote = async (optionId: number) => {
    if (isClosed) return

    const res = await apiFetch('/api/chat/poll/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId: msg.id,
        optionId,
      }),
    })

    if (!res.ok) {
      alert('이미 투표했습니다.')
      return
    }

    onRefresh?.()
  }

  /* ======================
     투표 마감
  ====================== */
  const handleClosePoll = () => {
    onClose?.()
  }

  /* ======================
     투표 삭제
  ====================== */
  const handleDeletePoll = () => {
    onDelete?.()
  }

  /* ======================
   투표 취소
====================== */
  const handleUnvote = async () => {
    if (isClosed) return

    await apiFetch('/api/chat/poll/unvote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId: msg.id,
      }),
    })

    onRefresh?.()
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 480

  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedUser = localStorage.getItem('loggedInUser')
    if (!storedUser) return

    try {
      const parsed = JSON.parse(storedUser)
      const userId = parsed.id
      if (!userId) return

      const raw = localStorage.getItem(`theme_settings_${userId}`)
      if (!raw) return

      const settings = JSON.parse(raw)
      setDarkMode(Boolean(settings.darkMode))
    } catch {
      setDarkMode(false)
    }
  }, [])

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.darkMode !== undefined) {
        setDarkMode(e.detail.darkMode)
      }
    }

    window.addEventListener('theme-change', handler)
    return () => window.removeEventListener('theme-change', handler)
  }, [])

  return (
    <div
      style={{
        background: darkMode ? '#1e293b' : 'white',
        borderRadius: 14,
        padding: '16px 14px',
        border: darkMode ? '1px solid #334155' : '1px solid #e5e7eb',
        color: darkMode ? '#e5e7eb' : '#111827',
        width: '100%',
        maxWidth: isMobile ? 240 : 400,
      }}
    >
      {/* 제목 */}
      <div
        style={{
          fontWeight: 700,
          fontSize: 16,
          marginBottom: 6,
          lineHeight: 1.3,
        }}
      >
        📊 {poll?.title}
      </div>

      {remainingText && (
        <div
          style={{
            fontSize: 12,
            color: isClosed
              ? darkMode
                ? '#f87171'
                : '#ef4444'
              : darkMode
                ? '#60a5fa'
                : '#2563eb',
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          ⏰ {remainingText}
        </div>
      )}

      {/* 옵션 */}
      {poll?.options.map((opt: any) => {
        const result = results.find((r: any) => r.optionId === opt.id)

        const count = result?.count ?? 0
        const percent =
          totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100)

        return (
          <div key={opt.id} style={{ marginBottom: 10 }}>
            {/* 투표 전 */}
            {/* 아직 내가 투표 안 했을 때 */}
            {!isClosed && myVote === null && (
              <button
                onClick={() => handleVote(opt.id)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: darkMode ? '#334155' : '#f9fafb',
                  border: darkMode ? '1px solid #475569' : '1px solid #d1d5db',
                  color: darkMode ? '#e2e8f0' : '#111827',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                  minHeight: 44,
                }}
              >
                {opt.text}
              </button>
            )}

            {/* 내가 선택한 옵션 → 취소 가능 */}
            {!isClosed && myVote === opt.id && (
              <button
                onClick={handleUnvote}
                style={{
                  width: '100%',
                  padding: isMobile ? '4px 12px' : '8px 12px',
                  borderRadius: 10,
                  background: darkMode ? '#3f1d1d' : '#fee2e2',
                  color: darkMode ? '#fca5a5' : '#b91c1c',
                  border: darkMode ? '1px solid #7f1d1d' : '1px solid #ef4444',
                  cursor: 'pointer',
                  fontWeight: 600,
                  marginTop: 4,
                }}
              >
                선택 취소
              </button>
            )}

            {/* 투표 후 */}
            {(isClosed || totalVotes > 0) && (
              <>
                <div
                  style={{
                    height: 12,
                    background: darkMode ? '#334155' : '#e5e7eb',
                    borderRadius: 999,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${percent}%`,
                      height: '100%',
                      background: '#4FC3F7',
                    }}
                  />
                </div>

                <div
                  style={{
                    fontSize: 12,
                    marginTop: 4,
                    color: darkMode ? '#cbd5e1' : '#374151',
                    fontWeight: 600,
                  }}
                >
                  {opt.text} · {count}표 ({percent}%)
                </div>

                {/* 실명 투표일 때만 표시 */}
                {!isAnonymous && result?.voters && (
                  <div
                    style={{
                      fontSize: 11,
                      color: darkMode ? '#94a3b8' : '#6b7280',
                      marginTop: 2,
                    }}
                  >
                    {result.voters.map((v: any) => v.name).join(', ')}
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}

      {/* 하단 액션 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 10,
          fontSize: 12,
          color: darkMode ? '#94a3b8' : '#6b7280',
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <span>
            {isAnonymous ? '🙈 익명 투표' : '🙋 실명 투표'}
            {isClosed && ' · ⛔ 마감'}
          </span>

          {/* 👀 읽은 사람 수 */}
          {typeof msg.readCount === 'number' && (
            <span
              style={{
                color: darkMode ? '#60a5fa' : '#2563eb',
                fontWeight: 600,
              }}
            >
              👀 {msg.readCount}
            </span>
          )}
        </div>

        {isOwner && (
          <div style={{ display: 'flex', gap: 8 }}>
            {!isClosed && (
              <button
                onClick={handleClosePoll}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: darkMode ? '#60a5fa' : '#2563eb',
                  cursor: 'pointer',
                  fontSize: 13,
                  padding: '6px 4px',
                }}
              >
                마감
              </button>
            )}

            <button
              onClick={handleDeletePoll}
              style={{
                border: 'none',
                background: 'transparent',
                color: darkMode ? '#f87171' : '#ef4444',
                cursor: 'pointer',
              }}
            >
              삭제
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
