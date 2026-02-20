'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/src/lib/apiFetch'
import AdminConfirmModal from '@/src/components/AdminConfirmModal'

interface RejoinRequest {
  id: number
  username: string
  provider: string
  social_id: string | null
  deleted_at: string
  rejoin_available_at: string
}

export default function AdminRejoinPage() {
  const [list, setList] = useState<RejoinRequest[]>([])
  const [loading, setLoading] = useState(true)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTargetId, setConfirmTargetId] = useState<number | null>(null)

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null)

  function openCancelModal(id: number) {
    setCancelTargetId(id)
    setCancelOpen(true)
  }

  const adminId = 'admin_master'

  async function loadList() {
    const res = await apiFetch('/api/admin/rejoin-requests')
    const data = await res.json()
    setList(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    loadList()
  }, [])

  function openApproveModal(id: number) {
    setConfirmTargetId(id)
    setConfirmOpen(true)
  }

  async function confirmApprove() {
    if (!confirmTargetId) return

    const res = await apiFetch('/api/admin/approve-rejoin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deletedUserId: confirmTargetId,
        adminId,
      }),
    })

    if (!res.ok) {
      alert('승인 실패')
      return
    }

    alert('승인 완료')

    // ✅ UI 즉시 반영
    setList((prev) => prev.filter((u) => u.id !== confirmTargetId))

    // 모달 닫기
    setConfirmOpen(false)
    setConfirmTargetId(null)
  }

  async function confirmCancel() {
    if (!cancelTargetId) return

    const res = await apiFetch('/api/admin/cancel-rejoin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deletedUserId: cancelTargetId,
      }),
    })

    if (!res.ok) {
      alert('승인 취소 실패')
      return
    }

    alert('승인 취소 완료')

    setList((prev) => prev.filter((u) => u.id !== cancelTargetId))

    setCancelOpen(false)
    setCancelTargetId(null)
  }

  if (loading) return <p style={{ padding: 40 }}>불러오는 중...</p>

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: '40px auto',
        padding: '0 16px',
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
        🛡 재가입 승인 요청
      </h1>

      {/* 카드 컨테이너 */}
      <div
        style={{
          background: '#fff',
          padding: 20,
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          overflowX: 'auto',
        }}
      >
        {list.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              color: '#6B7280',
              fontWeight: 600,
            }}
          >
            승인 대기 중인 계정이 없습니다.
          </div>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>ID</th>
                <th style={th}>Provider</th>
                <th style={th}>탈퇴일</th>
                <th style={th}>재가입 가능일</th>
                <th style={th}>관리</th>
              </tr>
            </thead>

            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td style={td}>
                    <span style={userBadge('#E0F2FE', '#0369A1')}>
                      {u.username}
                    </span>
                  </td>

                  <td style={td}>
                    <span style={providerBadge(u.provider)}>{u.provider}</span>
                  </td>

                  <td style={td}>{new Date(u.deleted_at).toLocaleString()}</td>

                  <td style={td}>
                    {new Date(u.rejoin_available_at).toLocaleDateString()}
                  </td>

                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => openApproveModal(u.id)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#16A34A',
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginRight: 12,
                      }}
                    >
                      승인
                    </button>

                    <button
                      onClick={() => openCancelModal(u.id)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#DC2626',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      승인 취소
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <AdminConfirmModal
        open={confirmOpen}
        title="재가입 승인"
        message="이 계정의 재가입을 승인하시겠습니까?"
        confirmText="승인"
        danger={false}
        onClose={() => {
          setConfirmOpen(false)
          setConfirmTargetId(null)
        }}
        onConfirm={confirmApprove}
      />

      <AdminConfirmModal
        open={cancelOpen}
        title="승인 취소"
        message="이 계정의 재가입 승인을 취소하시겠습니까?"
        confirmText="취소 확정"
        danger={true}
        onClose={() => {
          setCancelOpen(false)
          setCancelTargetId(null)
        }}
        onConfirm={confirmCancel}
      />
    </div>
  )
}

/* ================= 스타일 ================= */

const table: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
}

const th: React.CSSProperties = {
  padding: '12px 10px',
  textAlign: 'left',
  borderBottom: '2px solid #E5E7EB',
  fontWeight: 700,
  fontSize: 14,
  whiteSpace: 'nowrap',
}

const td: React.CSSProperties = {
  padding: '12px 10px',
  borderBottom: '1px solid #E5E7EB',
  fontSize: 14,
  verticalAlign: 'middle',
}

const userBadge = (bg: string, color: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '4px 10px',
  borderRadius: 999,
  background: bg,
  color,
  fontWeight: 700,
  fontSize: 12,
})

const providerBadge = (provider: string): React.CSSProperties => {
  const map: Record<string, { bg: string; color: string }> = {
    email: { bg: '#F3F4F6', color: '#374151' },
    kakao: { bg: '#FEF3C7', color: '#92400E' },
    google: { bg: '#E0F2FE', color: '#0369A1' },
  }

  const style = map[provider] ?? map.email

  return {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    background: style.bg,
    color: style.color,
    fontWeight: 700,
    fontSize: 12,
  }
}
