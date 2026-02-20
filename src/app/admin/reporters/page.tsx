'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/src/lib/apiFetch'
import Toast from '@/src/components/Toast'
import AdminBanModal from '@/src/components/AdminBanModal'

export default function AdminReportersPage() {
  const [reporters, setReporters] = useState<any[]>([])
  const [toast, setToast] = useState<string | null>(null)

  const [banTarget, setBanTarget] = useState<any>(null)

  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest')

  async function load() {
    const res = await apiFetch('/api/admin/reporters')
    const data = await res.json()
    setReporters(data.reporters || [])
  }

  const [confirmModal, setConfirmModal] = useState<{
    title: string
    message: string
    onConfirm: () => Promise<void>
  } | null>(null)

  useEffect(() => {
    load()
  }, [])

  const filteredAndSorted = reporters
    .filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aDate = new Date(a.last_reported_at).getTime()
      const bDate = new Date(b.last_reported_at).getTime()

      return sortOrder === 'latest' ? bDate - aDate : aDate - bDate
    })

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: '40px auto', // ✅ 가로 중앙 정렬
        padding: '0 16px', // ✅ 모바일 좌우 여백
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
        🚨 신고자 관리
      </h1>

      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          placeholder="이름 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 200,
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid #E5E7EB',
          }}
        />

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as 'latest' | 'oldest')}
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid #E5E7EB',
            cursor: 'pointer',
          }}
        >
          <option value="latest">최신 신고순</option>
          <option value="oldest">오래된 신고순</option>
        </select>
      </div>

      <div
        style={{
          background: '#fff',
          padding: 20,
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>이름</th>
              <th style={th}>신고 횟수</th>
              <th style={th}>최근 신고</th>
              <th style={th}>상태</th>
              <th style={th}>관리</th>
            </tr>
          </thead>

          <tbody>
            {filteredAndSorted.map((r) => (
              <tr key={r.user_id}>
                <td style={td}>{r.name}</td>

                <td style={td}>
                  {r.report_count}
                  {r.report_count >= 5 && ' 🚨'}
                </td>

                <td style={td}>
                  {new Date(r.last_reported_at).toLocaleString()}
                </td>

                <td style={td}>
                  {r.is_banned ? (
                    <span style={{ color: '#B91C1C', fontWeight: 700 }}>
                      정지됨
                    </span>
                  ) : (
                    <span style={{ color: '#166534', fontWeight: 700 }}>
                      정상
                    </span>
                  )}
                </td>

                <td style={{ ...td, display: 'flex', gap: 8 }}>
                  {/* 계정 정지 / 해제 */}
                  {!r.is_banned ? (
                    <button onClick={() => setBanTarget(r)} style={banBtn}>
                      계정 정지
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        await apiFetch(`/api/admin/users/${r.user_id}/ban`, {
                          method: 'DELETE',
                        })
                        setToast('계정 정지가 해제되었습니다.')
                        await load()
                      }}
                      style={unbanBtn}
                    >
                      정지 해제
                    </button>
                  )}

                  {/* 🧹 신고 기록 삭제 */}
                  <button
                    onClick={() =>
                      setConfirmModal({
                        title: '신고 기록 삭제',
                        message: `${r.name}의 모든 신고 기록을 삭제할까요?\n이 작업은 되돌릴 수 없습니다.`,
                        onConfirm: async () => {
                          await apiFetch(`/api/admin/reporters/${r.user_id}`, {
                            method: 'DELETE',
                          })
                          setToast('신고 기록이 삭제되었습니다.')
                          setConfirmModal(null)
                          load()
                        },
                      })
                    }
                    style={deleteBtn}
                  >
                    신고 기록 삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* 🚫 계정 정지 기간 선택 모달 (⭐ 여기 추가 ⭐) */}
      {banTarget && (
        <AdminBanModal
          open
          username={banTarget.name}
          targetType="reporter" // ⭐ 핵심 1
          onClose={() => setBanTarget(null)}
          onConfirm={async (type, reason) => {
            // ⭐ 핵심 2
            await apiFetch(`/api/admin/users/${banTarget.user_id}/ban`, {
              method: 'POST',
              body: JSON.stringify({
                type,
                reason, // 신고자 정지 사유 그대로 저장
              }),
            })

            setBanTarget(null)
            setToast('계정이 정지되었습니다.')
            await load()
          }}
        />
      )}

      {confirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              width: '90%',
              maxWidth: 380,
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              textAlign: 'center',
              animation: 'scaleIn 0.2s ease-out',
            }}
          >
            {/* 아이콘 */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: '#FEE2E2',
                color: '#B91C1C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                fontWeight: 700,
                margin: '0 auto 12px',
              }}
            >
              !
            </div>

            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
              {confirmModal.title}
            </h3>

            <p
              style={{
                fontSize: 13,
                color: '#374151',
                whiteSpace: 'pre-line',
                lineHeight: 1.5,
                marginBottom: 18,
              }}
            >
              {confirmModal.message}
            </p>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setConfirmModal(null)}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 999,
                  border: '1px solid #D1D5DB',
                  background: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                취소
              </button>

              <button
                onClick={confirmModal.onConfirm}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 999,
                  border: 'none',
                  background: '#EF4444',
                  color: 'white',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                확인
              </button>
            </div>
          </div>

          <style jsx>{`
            @keyframes scaleIn {
              from {
                opacity: 0;
                transform: scale(0.9);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}

/* ================= 스타일 ================= */

const th: React.CSSProperties = {
  padding: '10px',
  borderBottom: '2px solid #E5E7EB',
  textAlign: 'left',
  fontWeight: 700,
}

const td: React.CSSProperties = {
  padding: '10px',
  borderBottom: '1px solid #E5E7EB',
}

const banBtn: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: 'none',
  background: '#FEE2E2',
  color: '#B91C1C',
  fontWeight: 600,
  cursor: 'pointer',
}

const unbanBtn: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: 'none',
  background: '#DCFCE7',
  color: '#166534',
  fontWeight: 600,
  cursor: 'pointer',
}

const deleteBtn: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: 'none',
  background: '#E5E7EB',
  color: '#111827',
  fontWeight: 600,
  cursor: 'pointer',
}
