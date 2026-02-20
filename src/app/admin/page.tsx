'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/src/lib/apiFetch'
import AdminBanModal from '@/src/components/AdminBanModal'
import Toast from '@/src/components/Toast'

export default function AdminPage() {
  const [reports, setReports] = useState<any[]>([])

  const [banTarget, setBanTarget] = useState<any>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [confirmModal, setConfirmModal] = useState<{
    title: string
    message: string
    onConfirm: () => Promise<void>
  } | null>(null)

  const [search, setSearch] = useState('')

  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest')

  async function load() {
    const res = await apiFetch('/api/admin/reports/posts')
    const data = await res.json()
    setReports(data.reports || [])
  }

  useEffect(() => {
    load()
  }, [])

  const filteredReports = reports
    .filter((r) => {
      if (!search.trim()) return true

      const keyword = search.toLowerCase()

      const authorMatch = r.author_name?.toLowerCase().includes(keyword)
      const reporterMatch = r.reporter_names?.toLowerCase().includes(keyword)

      return authorMatch || reporterMatch
    })
    .sort((a, b) => {
      const aDate = new Date(a.last_reported_at).getTime()
      const bDate = new Date(b.last_reported_at).getTime()

      return sortOrder === 'latest' ? bDate - aDate : aDate - bDate
    })

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: '40px auto', // ✅ 가로 중앙 정렬
        padding: '0 16px', // ✅ 모바일 여백 (선택이지만 강력 추천)
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
        🚨 신고된 게시글
      </h1>

      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 20,
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          placeholder="작성자 또는 신고자 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
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
            whiteSpace: 'nowrap',
          }}
        >
          <option value="latest">최신 신고순</option>
          <option value="oldest">오래된 신고순</option>
        </select>
      </div>

      {/* ✅ 테이블 카드 컨테이너 */}
      <div
        style={{
          background: '#ffffff',
          padding: 20,
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          width: '100%',
          overflowX: 'auto',
        }}
      >
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>제목</th>
              <th style={th}>작성자</th>
              <th style={th}>신고자</th>
              <th style={th}>신고수</th>
              <th style={th}>유형</th>
              <th style={th}>최근 신고</th>
              <th style={th}>관리</th>
            </tr>
          </thead>

          <tbody>
            {filteredReports.map((r) => (
              <tr
                key={`${r.target_type}-${r.target_id}`}
                style={{
                  background: r.is_hidden ? '#F9FAFB' : 'transparent',
                }}
              >
                <td style={td}>
                  {r.target_type === 'post' ? '📝 ' : ' '}
                  {r.title}
                </td>
                <td style={td}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {r.author_name}

                    {(r.author_is_banned || r.author_banned_at) && (
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: 6,
                          background: '#FEE2E2',
                          color: '#B91C1C',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        정지됨
                      </span>
                    )}
                  </span>
                </td>

                {/* ✅ 신고자 */}
                <td style={td}>
                  {r.reporter_names
                    ? r.reporter_names.split(', ').length > 2
                      ? `${r.reporter_names.split(', ').slice(0, 2).join(', ')} 외 ${
                          r.reporter_names.split(', ').length - 2
                        }명`
                      : r.reporter_names
                    : '-'}
                </td>

                <td style={td}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: r.report_count >= 3 ? '#FEE2E2' : '#E5E7EB',
                      color: r.report_count >= 3 ? '#B91C1C' : '#374151',
                      fontWeight: 700,
                      fontSize: 12,
                      minWidth: 48,
                      textAlign: 'center',
                    }}
                  >
                    {r.report_count}회
                  </span>
                </td>

                <td style={td}>
                  {r.target_type === 'post' ? '게시글' : '댓글'} ·{' '}
                  {r.report_types}
                </td>

                <td style={td}>
                  {new Date(r.last_reported_at).toLocaleString()}
                </td>

                <td
                  style={{ ...td, display: 'flex', gap: 8, flexWrap: 'wrap' }}
                >
                  {/* 게시글 / 댓글 보기 */}
                  <a
                    href={
                      r.target_type === 'post'
                        ? `/board/post/${r.target_id}`
                        : `/board/post/${r.post_id}#comment-${r.target_id}`
                    }
                    target="_blank"
                    style={{ color: '#2563EB', fontWeight: 600 }}
                  >
                    {r.target_type === 'post' ? '게시글 보기' : '댓글 보기'}
                  </a>

                  {/* 블라인드 버튼 */}
                  <button
                    onClick={() =>
                      setConfirmModal({
                        title: r.is_hidden
                          ? '블라인드 해제'
                          : '게시글 블라인드',
                        message: r.is_hidden
                          ? '이 콘텐츠의 블라인드를 해제하시겠습니까?'
                          : '이 콘텐츠를 블라인드 처리하시겠습니까?\n사용자에게 즉시 적용됩니다.',
                        onConfirm: async () => {
                          await apiFetch(
                            r.target_type === 'post'
                              ? `/api/admin/posts/${r.target_id}/hidden`
                              : `/api/admin/comments/${r.target_id}/hidden`,
                            {
                              method: 'POST',
                              body: JSON.stringify({ hidden: !r.is_hidden }),
                            },
                          )

                          setReports((prev) =>
                            prev.map((p) =>
                              p.target_type === r.target_type &&
                              p.target_id === r.target_id
                                ? { ...p, is_hidden: !p.is_hidden }
                                : p,
                            ),
                          )

                          setConfirmModal(null)
                        },
                      })
                    }
                    style={{
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      background: r.is_hidden ? '#E0F2FE' : '#FEE2E2',
                      color: r.is_hidden ? '#0284C7' : '#B91C1C',
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    {r.is_hidden ? '해제' : '블라인드'}
                  </button>

                  {/* 🚫 계정 정지 버튼 (정지 안 된 경우만 보이게) */}
                  {!(r.author_is_banned || r.author_banned_at) && (
                    <button
                      onClick={() => setBanTarget(r)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 6,
                        border: 'none',
                        cursor: 'pointer',
                        background: '#111827',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      계정 정지
                    </button>
                  )}

                  {/* 🔓 정지 해제 버튼 (정지된 경우만 보이게) */}
                  {(r.author_is_banned || r.author_banned_at) && (
                    <button
                      onClick={() =>
                        setConfirmModal({
                          title: '계정 정지 해제',
                          message: `${r.author_name} 계정의 정지를 해제하시겠습니까?`,
                          onConfirm: async () => {
                            await apiFetch(
                              `/api/admin/users/${r.author_id}/ban`,
                              {
                                method: 'DELETE',
                              },
                            )
                            setToast('계정 정지가 해제되었습니다.')
                            setConfirmModal(null)
                            await load()
                          },
                        })
                      }
                      style={{
                        padding: '5px 10px',
                        borderRadius: 6,
                        border: 'none',
                        cursor: 'pointer',
                        background: '#DCFCE7',
                        color: '#166534',
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      정지 해제
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* 🚫 계정 정지 모달 */}
      {banTarget && (
        <AdminBanModal
          open
          username={banTarget.author_name}
          targetType="content" // ← ⭐ 반드시 content
          onClose={() => setBanTarget(null)}
          onConfirm={async (type, reason) => {
            await apiFetch(`/api/admin/users/${banTarget.author_id}/ban`, {
              method: 'POST',
              body: JSON.stringify({
                type,
                reason,
              }),
            })

            setBanTarget(null)
            setToast('계정이 정지되었습니다.')
            await load()
          }}
        />
      )}

      {/* 🔔 토스트 알림 */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
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
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#FEE2E2',
                color: '#B91C1C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                fontWeight: 800,
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
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
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
