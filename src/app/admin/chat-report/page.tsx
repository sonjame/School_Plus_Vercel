'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/src/lib/apiFetch'
import AdminBanModal from '@/src/components/AdminBanModal'
import AdminResultModal from '@/src/components/AdminResultModal'
import AdminConfirmModal from '@/src/components/AdminConfirmModal'

type Report = {
  id: number
  reporter: string
  reporter_id: number
  reporter_banned: boolean
  reported: string
  reported_user_id: number
  reason: string
  created_at: string
}

export default function AdminChatReportsPage() {
  const [reports, setReports] = useState<Report[]>([])

  const [banModalOpen, setBanModalOpen] = useState(false)
  const [selectedReporter, setSelectedReporter] = useState<Report | null>(null)

  const [resultOpen, setResultOpen] = useState(false)
  const [resultMessage, setResultMessage] = useState('')
  const [resultType, setResultType] = useState<'success' | 'danger'>('success')

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<Report | null>(null)

  const [confirmMode, setConfirmMode] = useState<'unban' | 'delete' | null>(
    null,
  )

  async function load() {
    const res = await apiFetch('/api/admin/chat-reports')
    const data = await res.json()
    setReports(Array.isArray(data) ? data : [])
  }

  async function deleteReport(id: number) {
    if (!confirm('이 신고 내역을 삭제하시겠습니까?')) return

    await apiFetch('/api/admin/chat-reports/delete', {
      method: 'POST',
      body: JSON.stringify({ reportId: id }),
    })

    // ✅ 즉시 UI 반영
    setReports((prev) => prev.filter((r) => r.id !== id))
  }

  async function banReporter(report: Report) {
    if (!confirm(`신고자 "${report.reporter}"를 허위 신고로 정지하시겠습니까?`))
      return

    await apiFetch(`/api/admin/users/${report.reporter_id}/ban`, {
      method: 'POST',
      body: JSON.stringify({
        type: '24h', // or '72h', '7d', 'permanent'
        reason: '허위 신고 / 신고 기능 악용',
      }),
    })

    alert('신고자가 정지되었습니다.')
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: '40px auto',
        padding: '0 16px',
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
        💬 채팅 신고 관리
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
        {reports.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              color: '#6B7280',
              fontWeight: 600,
            }}
          >
            신고된 채팅이 없습니다.
          </div>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>신고 ID</th>
                <th style={th}>신고자</th>
                <th style={th}>피신고자</th>
                <th style={th}>사유</th>
                <th style={th}>신고 시각</th>
                <th style={th}>관리</th>
              </tr>
            </thead>

            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td style={td}>{r.id}</td>

                  <td style={td}>
                    <span style={userBadge('#E0F2FE', '#0369A1')}>
                      {r.reporter}
                    </span>
                  </td>

                  <td style={td}>
                    <span style={userBadge('#FEE2E2', '#B91C1C')}>
                      {r.reported}
                    </span>
                  </td>

                  <td style={td}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: '#F3F4F6',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {r.reason}
                    </span>
                  </td>

                  <td style={td}>{new Date(r.created_at).toLocaleString()}</td>

                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <Link
                      href={`/admin/chat-report/${r.id}`}
                      style={{
                        color: '#2563EB',
                        fontWeight: 700,
                        textDecoration: 'none',
                        marginRight: 12,
                      }}
                    >
                      상세
                    </Link>

                    {/* 🚫 아직 정지 안 된 경우 → 허위신고 정지 */}
                    {!r.reporter_banned && (
                      <button
                        onClick={() => {
                          setSelectedReporter(r)
                          setConfirmMode('unban')
                          setBanModalOpen(true)
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#7C2D12',
                          fontWeight: 700,
                          cursor: 'pointer',
                          marginRight: 8,
                        }}
                      >
                        허위신고 정지
                      </button>
                    )}

                    {/* ✅ 이미 정지된 경우 → 정지 해제 */}
                    {r.reporter_banned && (
                      <button
                        onClick={() => {
                          setConfirmTarget(r)
                          setConfirmMode('unban')
                          setConfirmOpen(true)
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#065F46',
                          fontWeight: 700,
                          cursor: 'pointer',
                          marginRight: 8,
                        }}
                      >
                        정지 해제
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setConfirmTarget(r)
                        setConfirmMode('delete')
                        setConfirmOpen(true)
                      }}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#DC2626',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedReporter && (
        <AdminBanModal
          open={banModalOpen}
          onClose={() => {
            setBanModalOpen(false)
            setSelectedReporter(null)
          }}
          username={selectedReporter.reporter}
          targetType="reporter"
          onConfirm={async (type, banReason) => {
            await apiFetch(
              `/api/admin/users/${selectedReporter.reporter_id}/ban`,
              {
                method: 'POST',
                body: JSON.stringify({
                  type,
                  reason: banReason,
                }),
              },
            )

            // ✅ 결과 모달용 메시지
            setResultMessage('신고자가 정지되었습니다.')
            setResultType('danger')
            setResultOpen(true)

            // 🔥 UI 즉시 반영
            setReports((prev) =>
              prev.map((item) =>
                item.reporter_id === selectedReporter.reporter_id
                  ? { ...item, reporter_banned: true }
                  : item,
              ),
            )

            setBanModalOpen(false)
            setSelectedReporter(null)
          }}
        />
      )}
      <AdminResultModal
        open={resultOpen}
        message={resultMessage}
        type={resultType}
        onClose={() => setResultOpen(false)}
      />

      {confirmTarget && confirmMode && (
        <AdminConfirmModal
          open={confirmOpen}
          title={confirmMode === 'delete' ? '신고 삭제' : '정지 해제'}
          message={
            confirmMode === 'delete'
              ? '이 신고 내역을 삭제하시겠습니까?'
              : `"${confirmTarget.reporter}" 계정의 정지를 해제하시겠습니까?`
          }
          confirmText={confirmMode === 'delete' ? '삭제' : '정지 해제'}
          danger={confirmMode === 'delete'}
          onClose={() => {
            setConfirmOpen(false)
            setConfirmTarget(null)
            setConfirmMode(null)
          }}
          onConfirm={async () => {
            if (confirmMode === 'delete') {
              // 🗑 신고 삭제
              await apiFetch('/api/admin/chat-reports/delete', {
                method: 'POST',
                body: JSON.stringify({ reportId: confirmTarget.id }),
              })

              setReports((prev) =>
                prev.filter((r) => r.id !== confirmTarget.id),
              )

              setResultMessage('신고 내역이 삭제되었습니다.')
              setResultType('success')
              setResultOpen(true)
            }

            if (confirmMode === 'unban') {
              // 🔓 정지 해제
              await apiFetch(
                `/api/admin/users/${confirmTarget.reporter_id}/ban`,
                { method: 'DELETE' },
              )

              setReports((prev) =>
                prev.map((item) =>
                  item.reporter_id === confirmTarget.reporter_id
                    ? { ...item, reporter_banned: false }
                    : item,
                ),
              )

              setResultMessage('신고자 정지가 해제되었습니다.')
              setResultType('success')
              setResultOpen(true)
            }

            setConfirmOpen(false)
            setConfirmTarget(null)
            setConfirmMode(null)
          }}
        />
      )}
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
