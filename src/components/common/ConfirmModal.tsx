'use client'

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
  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
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
          background: 'white',
          borderRadius: 18,
          padding: '22px 20px',
          textAlign: 'center',
        }}
      >
        {title && (
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
            {title}
          </h3>
        )}

        <p
          style={{
            fontSize: 14,
            color: '#374151',
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
              border: '1px solid #d1d5db',
              background: 'white',
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
