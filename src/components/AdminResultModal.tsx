'use client'
import React from 'react'

interface Props {
  open: boolean
  message: string
  type?: 'success' | 'danger'
  onClose: () => void
}

export default function AdminResultModal({
  open,
  message,
  type = 'success',
  onClose,
}: Props) {
  if (!open) return null

  const isDanger = type === 'danger'

  return (
    <div style={overlay}>
      <div style={modal}>
        <div
          style={{
            fontSize: 32,
            marginBottom: 8,
          }}
        >
          {isDanger ? '🚫' : '✅'}
        </div>

        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 12,
            color: isDanger ? '#DC2626' : '#065F46',
          }}
        >
          {isDanger ? '처리 완료' : '완료'}
        </h3>

        <p
          style={{
            fontSize: 14,
            color: '#374151',
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          {message}
        </p>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '10px 0',
            borderRadius: 8,
            border: 'none',
            fontWeight: 700,
            cursor: 'pointer',
            background: isDanger ? '#DC2626' : '#111827',
            color: '#fff',
          }}
        >
          확인
        </button>
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
  width: 280,
  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
  textAlign: 'center',
}
