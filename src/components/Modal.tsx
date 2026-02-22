'use client'

import { ReactNode, useEffect } from 'react'

interface ModalProps {
  open: boolean
  title?: string
  onClose: () => void
  onConfirm?: () => void
  confirmText?: string
  danger?: boolean
  showCancel?: boolean
  darkMode?: boolean // 🌙 다크모드 추가
  children: React.ReactNode
}

export default function Modal({
  open,
  title,
  onClose,
  onConfirm,
  confirmText = '확인',
  danger,
  showCancel = true,
  darkMode = false, // 기본 false
  children,
}: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [open])

  if (!open) return null

  const backdropStyle = {
    ...styles.backdrop,
    background: darkMode ? 'rgba(15,23,42,0.75)' : 'rgba(0,0,0,0.45)',
  }

  const modalStyle = {
    ...styles.modal,
    background: darkMode ? '#020617' : '#ffffff',
    color: darkMode ? '#e5e7eb' : '#111827',
    boxShadow: darkMode
      ? '0 18px 45px rgba(15,23,42,0.9)'
      : '0 10px 30px rgba(0,0,0,0.2)',
  }

  const titleStyle = {
    ...styles.title,
    color: darkMode ? '#e5e7eb' : '#111827',
  }

  const contentStyle = {
    ...styles.content,
    color: darkMode ? '#cbd5f5' : '#374151',
  }

  const cancelBtnStyle = {
    ...styles.cancelBtn,
    background: darkMode ? '#020617' : '#ffffff',
    border: `1px solid ${darkMode ? '#4b5563' : '#d1d5db'}`,
    color: darkMode ? '#e5e7eb' : '#111827',
  }

  const confirmBtnStyle = {
    ...styles.confirmBtn,
    background: danger ? '#ef4444' : '#2563eb',
    boxShadow: darkMode
      ? '0 4px 12px rgba(37,99,235,0.7)'
      : '0 4px 12px rgba(37,99,235,0.3)',
  }

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {title && <h3 style={titleStyle}>{title}</h3>}

        <div style={contentStyle}>{children}</div>

        <div style={styles.actions}>
          {showCancel && (
            <button style={cancelBtnStyle} onClick={onClose}>
              취소
            </button>
          )}

          {onConfirm && (
            <button style={confirmBtnStyle} onClick={onConfirm}>
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
} as const
