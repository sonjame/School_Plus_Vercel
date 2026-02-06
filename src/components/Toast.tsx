'use client'

import { useEffect } from 'react'

export default function Toast({
  message,
  onClose,
}: {
  message: string
  onClose: () => void
}) {
  // ⏱ 1.5초 후 자동 닫힘
  useEffect(() => {
    const timer = setTimeout(onClose, 1500)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          padding: '22px 28px',
          borderRadius: 14,
          minWidth: 260,
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          animation: 'scaleIn 0.15s ease-out',
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            marginBottom: 14,
          }}
        >
          알림
        </div>

        <div
          style={{
            fontSize: 14,
            color: '#374151',
            marginBottom: 18,
          }}
        >
          {message}
        </div>

        <button
          onClick={onClose}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            border: 'none',
            background: '#111827',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          확인
        </button>
      </div>

      {/* 애니메이션 */}
      <style>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}
