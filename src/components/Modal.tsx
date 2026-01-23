'use client'

import { ReactNode, useEffect } from 'react'

interface ModalProps {
  open: boolean
  title?: string
  onClose: () => void
  onConfirm?: () => void
  confirmText?: string
  danger?: boolean
  showCancel?: boolean // ⭐ 추가
  children: React.ReactNode
}

export default function Modal({
  open,
  title,
  onClose,
  onConfirm,
  confirmText = '확인',
  danger,
  showCancel = true, // ⭐ 기본은 취소 버튼 보임
  children,
}: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [open])

  if (!open) return null

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {title && <h3 style={styles.title}>{title}</h3>}

        <div style={styles.content}>{children}</div>

        <div style={styles.actions}>
          {showCancel && (
            <button style={styles.cancelBtn} onClick={onClose}>
              취소
            </button>
          )}

          {onConfirm && (
            <button
              style={{
                ...styles.confirmBtn,
                background: danger ? '#ef4444' : '#2563eb',
              }}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ================= 스타일 ================= */
const styles = {
  backdrop: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },

  modal: {
    width: '80%',
    maxWidth: 420,
    background: '#fff',
    borderRadius: 16,
    padding: '20px 22px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    animation: 'scaleIn 0.2s ease-out',
  },

  title: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 10,
  },

  content: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 1.6,
    marginBottom: 18,
  },

  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
  },

  cancelBtn: {
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 14,
  },

  confirmBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
}
