'use client'

import { apiFetch } from '@/src/lib/apiFetch'

type PollMessageProps = {
  msg: any
  currentUser: any
  onRefresh?: () => void
}

export default function PollMessage({
  msg,
  currentUser,
  onRefresh,
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
  const handleClosePoll = async () => {
    if (!confirm('투표를 마감하시겠습니까?')) return

    await apiFetch('/api/chat/poll/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId: msg.id,
      }),
    })

    onRefresh?.()
  }

  /* ======================
     투표 삭제
  ====================== */
  const handleDeletePoll = async () => {
    if (!confirm('이 투표를 삭제하시겠습니까?')) return

    await apiFetch(`/api/chat/messages/delete/${msg.id}`, {
      method: 'DELETE',
    })

    onRefresh?.()
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

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 14,
        padding: '16px 14px',
        border: '1px solid #e5e7eb',
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
            color: isClosed ? '#ef4444' : '#2563eb',
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
                  border: '1px solid #d1d5db',
                  background: '#f9fafb',
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
                  border: '1px solid #ef4444',
                  background: '#fee2e2',
                  color: '#b91c1c',
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
                    background: '#e5e7eb',
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
                    color: '#374151',
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
                      color: '#6b7280',
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
          color: '#6b7280',
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <span>
            {isAnonymous ? '🙈 익명 투표' : '🙋 실명 투표'}
            {isClosed && ' · ⛔ 마감'}
          </span>

          {/* 👀 읽은 사람 수 */}
          {typeof msg.readCount === 'number' && (
            <span style={{ color: '#2563eb', fontWeight: 600 }}>
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
                  color: '#2563eb',
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
                color: '#ef4444',
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
