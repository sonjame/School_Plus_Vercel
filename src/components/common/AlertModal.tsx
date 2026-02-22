'use client'
import { useEffect, useState } from 'react'

type AlertModalProps = {
  open: boolean
  title?: string
  message: string
  confirmText?: string
  onClose: () => void
}

export default function AlertModal({
  open,
  title = '알림',
  message,
  confirmText = '확인',
  onClose,
}: AlertModalProps) {
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
        alignItems: 'center',
        justifyContent: 'center',
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
            ? '0 15px 40px rgba(0,0,0,0.6)'
            : '0 20px 40px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>

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

        <p
          style={{
            fontSize: 14,
            color: darkMode? '#cbd5e1' : '#4b5563',
            lineHeight: 1.5,
            marginBottom: 18,
            whiteSpace: 'pre-line',
          }}
        >
          {message}
        </p>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '10px 0',
            borderRadius: 999,
            border: 'none',
            background: '#4FC3F7',
            color: 'white',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {confirmText}
        </button>
      </div>
    </div>
  )
}
