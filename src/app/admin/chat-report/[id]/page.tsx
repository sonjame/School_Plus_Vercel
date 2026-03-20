'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '@/src/lib/apiFetch'
import AdminBanModal from '@/src/components/AdminBanModal'

export default function AdminChatReportDetail() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [banModalOpen, setBanModalOpen] = useState(false)

  /* =====================
     신고 상세 조회
  ===================== */
  useEffect(() => {
    if (!id) return

    apiFetch(`/api/admin/chat-reports/${id}`)
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [id])

  /* =====================
     사용자 정지
  ===================== */
  const handleBanConfirm = async (
    type: '24h' | '72h' | '7d' | 'permanent',
    _banReason: string, // ⬅️ 안 씀 (채팅 관리자에서는)
    chatReportReason: string, // ⬅️ 이걸 정지 사유로 사용
  ) => {
    await apiFetch(`/api/admin/users/${data.reported_user_id}/ban`, {
      method: 'POST',
      body: JSON.stringify({
        type,
        reason: chatReportReason, // 🔥 핵심
      }),
    })

    alert('처리가 완료되었습니다.')
    setBanModalOpen(false)
    router.push('/admin/chat-report')
  }

  const handleUnban = async () => {
    if (!confirm('이 계정의 정지를 해제하시겠습니까?')) return

    await apiFetch(`/api/admin/users/${data.reported_user_id}/ban`, {
      method: 'DELETE',
    })

    alert('계정 정지가 해제되었습니다.')

    // 🔄 화면 갱신 (다시 조회)
    setLoading(true)
    const res = await apiFetch(`/api/admin/chat-reports/${id}`)
    const refreshed = await res.json()
    setData(refreshed)
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>
        불러오는 중…
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#EF4444' }}>
        신고 정보를 찾을 수 없습니다.
      </div>
    )
  }

  return (
    <div
      style={{
        maxWidth: 900,
        margin: '40px auto',
        padding: '0 16px',
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
        💬 채팅 신고 상세
      </h1>

      {/* 카드 */}
      <div
        style={{
          background: '#fff',
          padding: 24,
          borderRadius: 14,
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          width: '100%',
          maxWidth: 1100, // 🔥 카드만 넓게
          margin: '0 auto',
        }}
      >
        {/* 기본 정보 */}
        <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
          <InfoRow label="신고 ID" value={`${data.id}`} />

          <InfoRow
            label="피신고자"
            value={
              <span style={userBadge('#FEE2E2', '#B91C1C')}>
                {data.reported_username}
              </span>
            }
          />

          <InfoRow
            label="신고 사유"
            value={
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: '#F3F4F6',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {data.reason}
              </span>
            }
          />
        </div>

        {/* 채팅 내용 */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontWeight: 700,
              marginBottom: 8,
              color: '#374151',
            }}
          >
            신고된 채팅 내용
            {/* 🔥 삭제된 메시지 표시 */}
            {data.is_deleted && (
              <span
                style={{
                  marginLeft: 10,
                  color: '#DC2626',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                ⚠ 삭제된 메시지
              </span>
            )}
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 10,
              background: data.is_deleted ? '#FEF2F2' : '#F9FAFB', // 🔥 여기만 변경
              border: '1px solid #E5E7EB',
              whiteSpace: 'pre-wrap',
              fontSize: 14,
            }}
          >
            {data.content || '내용 없음'}
          </div>
        </div>

        {/* 관리 버튼 */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {data.is_banned || data.banned_at ? (
            // 🔓 정지 해제
            <button
              onClick={handleUnban}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: 'none',
                background: '#16A34A',
                color: '#fff',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              🔓 계정 정지 해제
            </button>
          ) : (
            // 🚫 정지
            <button
              onClick={() => setBanModalOpen(true)}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: 'none',
                background: '#DC2626',
                color: '#fff',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              🚫 계정 정지
            </button>
          )}

          <button
            onClick={() => router.push('/admin/chat-report')}
            style={{
              marginLeft: 'auto',
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              background: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ← 목록으로
          </button>
        </div>
      </div>
      {/* 🚫 계정 정지 모달 */}
      <AdminBanModal
        open={banModalOpen}
        onClose={() => setBanModalOpen(false)}
        username={data.reported_username}
        targetType="content"
        onConfirm={handleBanConfirm}
      />
    </div>
  )
}

/* ================= 공통 컴포넌트 ================= */

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div
        style={{
          width: 90,
          fontWeight: 700,
          color: '#6B7280',
          fontSize: 13,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14 }}>{value}</div>
    </div>
  )
}

function ActionButton({
  label,
  color,
  text,
  onClick,
}: {
  label: string
  color: string
  text: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: 8,
        border: 'none',
        background: color,
        color: text,
        fontWeight: 800,
        fontSize: 13,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

/* ================= 스타일 ================= */

const userBadge = (bg: string, color: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '4px 10px',
  borderRadius: 999,
  background: bg,
  color,
  fontWeight: 700,
  fontSize: 12,
})
