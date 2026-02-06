'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/src/lib/apiFetch'
import Toast from '@/src/components/Toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Notification = {
  id: number
  type: string
  title: string
  message: string
  link: string
  is_read: number
  created_at: string
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [toast, setToast] = useState<string | null>(null)

  const router = useRouter()

  async function load() {
    const res = await apiFetch('/api/admin/notifications')
    const data = await res.json()
    setNotifications(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  async function markAsRead(id: number) {
    await apiFetch('/api/admin/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ id }),
    })

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)),
    )
  }
  async function deleteNotification(id: number) {
    await apiFetch('/api/admin/notifications/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    })

    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div
      style={{
        maxWidth: 900,
        margin: '40px auto',
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
        🔔 관리자 알림
      </h1>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}
      >
        {notifications.length === 0 && (
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              color: '#6B7280',
              fontSize: 14,
            }}
          >
            새로운 알림이 없습니다.
          </div>
        )}

        {notifications.map((n) => (
          <div
            key={n.id}
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #E5E7EB',
              background: n.is_read ? '#fff' : '#F0F9FF',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            {/* ❌ 삭제 버튼 */}
            <button
              onClick={(e) => {
                e.stopPropagation() // 읽음 처리 방지
                deleteNotification(n.id)
              }}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                border: 'none',
                background: 'transparent',
                color: '#9CA3AF',
                fontSize: 16,
                cursor: 'pointer',
              }}
              title="알림 삭제"
            >
              ✕
            </button>

            {/* 기존 클릭 영역 */}
            <div
              onClick={() => {
                if (!n.is_read) markAsRead(n.id)

                // ✅ 서버에서 내려준 link를 최우선 사용
                if (n.link) {
                  router.push(n.link)
                  return
                }

                // ⛑ fallback (혹시 옛 데이터 link 없는 경우)
                if (n.type === 'report_post') {
                  router.push('/admin')
                } else {
                  router.push('/board/admin')
                }
              }}
            >
              <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 700 }}>{n.title}</span>

                {!n.is_read && (
                  <span
                    style={{
                      fontSize: 11,
                      background: '#EF4444',
                      color: '#fff',
                      padding: '2px 6px',
                      borderRadius: 999,
                      fontWeight: 700,
                    }}
                  >
                    NEW
                  </span>
                )}
              </div>

              <div style={{ fontSize: 14, color: '#374151', marginBottom: 6 }}>
                {n.message}
              </div>

              <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                {new Date(n.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
