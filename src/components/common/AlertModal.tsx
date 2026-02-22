'use client'

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
  if (!open) return null

  const isDark =
    typeof document !== 'undefined' && document.body.classList.contains('dark')

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
          background: isDark ? '#1e293b' : 'white',
          borderRadius: 18,
          padding: '22px 20px',
          textAlign: 'center',
          boxShadow: isDark
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
            color: isDark ? '#f1f5f9' : '#111827',
          }}
        >
          {title}
        </h3>

        <p
          style={{
            fontSize: 14,
            color: isDark ? '#cbd5e1' : '#4b5563',
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
