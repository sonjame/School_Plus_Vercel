'use client'
import { useEffect, useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (
    type: '24h' | '72h' | '7d' | 'permanent',
    banReason: string,
    chatReportReason: string, // ✅ 추가
  ) => void
  username: string
  targetType?: 'content' | 'reporter'
}

export default function AdminBanModal({
  open,
  onClose,
  onConfirm,
  username,
  targetType = 'content', // ✅ 기본값
}: Props) {
  const CONTENT_BAN_REASONS = [
    '욕설 / 비방',
    '음란 / 선정적 콘텐츠',
    '광고 / 스팸',
    '허위 정보',
    '도배 / 서비스 방해',
    '기타 (직접 입력)',
  ]

  const REPORTER_BAN_REASONS = [
    '악의적 신고',
    '허위 신고',
    '신고 기능 오남용',
    '보복성 신고',
    '비정상적인 신고 패턴',
    '기타 (직접 입력)',
  ]
  const CHAT_REPORT_REASONS = [
    '욕설 / 비하 발언',
    '성희롱 / 음란 채팅',
    '협박 / 위협',
    '광고 / 도배',
    '불쾌감을 주는 발언',
    '기타 (직접 입력)',
  ]

  // ✅ targetType에 따라 사유 결정
  const reasons =
    targetType === 'reporter' ? REPORTER_BAN_REASONS : CONTENT_BAN_REASONS

  const [reason, setReason] = useState(reasons[0])
  const [customReason, setCustomReason] = useState('')

  const [chatReason, setChatReason] = useState(CHAT_REPORT_REASONS[0])
  const [customChatReason, setCustomChatReason] = useState('')

  // ✅ targetType 바뀌면 초기화
  useEffect(() => {
    setReason(reasons[0])
    setCustomReason('')
  }, [targetType])

  if (!open) return null

  const options = [
    { label: '24시간 정지', value: '24h' },
    { label: '72시간 정지', value: '72h' },
    { label: '7일 정지', value: '7d' },
    { label: '영구 정지', value: 'permanent', danger: true },
  ]

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          🚫 계정 정지
        </h3>
        <p style={{ fontSize: 14, marginBottom: 16 }}>
          <b>{username}</b> 계정을 정지합니다.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                // 계정 정지 사유 검증
                // reporter일 때만 계정 정지 사유 검증
                if (
                  targetType === 'reporter' &&
                  reason === '기타 (직접 입력)' &&
                  !customReason.trim()
                ) {
                  alert('정지 사유를 입력해주세요.')
                  return
                }

                // content일 때만 채팅 신고 사유 검증
                if (
                  targetType === 'content' &&
                  chatReason === '기타 (직접 입력)' &&
                  !customChatReason.trim()
                ) {
                  alert('채팅 신고 사유를 입력해주세요.')
                  return
                }

                if (
                  o.value === 'permanent' &&
                  !confirm('정말 영구 정지하시겠습니까?')
                ) {
                  return
                }

                const finalBanReason =
                  targetType === 'reporter'
                    ? reason === '기타 (직접 입력)'
                      ? customReason.trim()
                      : reason
                    : ''

                const finalChatReason =
                  targetType === 'content'
                    ? chatReason === '기타 (직접 입력)'
                      ? customChatReason.trim()
                      : chatReason
                    : ''

                // ✅ 핵심: 인자 3개 전달
                onConfirm(o.value as any, finalBanReason, finalChatReason)
              }}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                background: o.danger ? '#DC2626' : '#111827',
                color: '#fff',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>

        {targetType === 'reporter' && (
          <>
            <label style={{ fontSize: 13, fontWeight: 600 }}>정지 사유</label>

            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                marginBottom: 8,
              }}
            >
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {reason === '기타 (직접 입력)' && (
              <textarea
                placeholder="정지 사유를 입력하세요"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: 8,
                  borderRadius: 8,
                  border: '1px solid #D1D5DB',
                  resize: 'none',
                  marginBottom: 12,
                }}
              />
            )}
          </>
        )}

        {/* 🚨 채팅 신고 사유 */}
        {targetType === 'content' && (
          <>
            <label style={{ fontSize: 13, fontWeight: 600, marginTop: 12 }}>
              🚨 채팅 신고 사유
            </label>

            <select
              value={chatReason}
              onChange={(e) => setChatReason(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                marginBottom: 8,
              }}
            >
              {CHAT_REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {chatReason === '기타 (직접 입력)' && (
              <textarea
                placeholder="채팅 신고 사유를 입력하세요"
                value={customChatReason}
                onChange={(e) => setCustomChatReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: 8,
                  borderRadius: 8,
                  border: '1px solid #D1D5DB',
                  resize: 'none',
                  marginBottom: 12,
                }}
              />
            )}
          </>
        )}

        <button onClick={onClose} style={cancel}>
          취소
        </button>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
}

const modal: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 20,
  width: 300,
}

const cancel: React.CSSProperties = {
  marginTop: 12,
  width: '100%',
  background: '#E5E7EB',
  border: 'none',
  padding: 8,
  borderRadius: 8,
  cursor: 'pointer',
}
