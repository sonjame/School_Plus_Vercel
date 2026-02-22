'use client'
import { useEffect, useState } from 'react'

type ConfirmModalProps = {
  open: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  onConfirm?: () => void
  onClose: () => void
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  danger,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
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
  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90%',
          maxWidth: 360,
          background: darkMode ? '#1e293b' : 'white',
          borderRadius: 18,
          padding: '22px 20px',
          textAlign: 'center',
          boxShadow: darkMode
            ? '0 10px 30px rgba(0,0,0,0.6)'
            : '0 10px 30px rgba(0,0,0,0.15)',
        }}
      >
        {title && (
          <h3
            style={{
              fontSize: 16,
              fontWeight: 800,
              marginBottom: 8,
              color: darkMode ? '#f1f5f9' : '#111827',
            }}
          >
            {title}
          </h3>
        )}

        <p
          style={{
            fontSize: 14,
            color: darkMode ? '#cbd5e1' : '#374151',
            lineHeight: 1.5,
            marginBottom: 20,
            whiteSpace: 'pre-line',
          }}
        >
          {message}
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 999,
              border: darkMode ? '1px solid #475569' : '1px solid #d1d5db',
              background: darkMode ? '#334155' : 'white',
              color: darkMode ? '#e5e7eb' : '#111827',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {cancelText}
          </button>

          {onConfirm && (
            <button
              onClick={onConfirm}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 999,
                border: 'none',
                background: danger ? '#ef4444' : '#4FC3F7',
                color: 'white',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
