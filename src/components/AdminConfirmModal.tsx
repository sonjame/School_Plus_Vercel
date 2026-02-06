'use client'
import React from 'react'

interface Props {
  open: boolean
  title?: string
  message: string
  confirmText?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function AdminConfirmModal({
  open,
  title = '확인',
  message,
  confirmText = '확인',
  danger = false,
  onConfirm,
  onClose,
}: Props) {
  if (!open) return null

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          {title}
        </h3>

        <p style={{ fontSize: 14, color: '#374151', marginBottom: 20 }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 8,
              border: 'none',
              background: '#E5E7EB',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            취소
          </button>

          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 8,
              border: 'none',
              background: danger ? '#DC2626' : '#111827',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
}

const modal: React.CSSProperties = {
  background: '#fff',
  borderRadius: 14,
  padding: 24,
  width: 300,
}
