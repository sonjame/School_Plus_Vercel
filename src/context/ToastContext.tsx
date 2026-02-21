'use client'

import { createContext, useContext, useState } from 'react'
import { usePathname } from 'next/navigation' // 🔥 추가

type Toast = {
  id: number
  title: string
  message: string
}

const ToastContext = createContext<{
  showToast: (title: string, message: string) => void
} | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() // 🔥 추가
  const [toastList, setToastList] = useState<Toast[]>([])

  // 🔥 관리자 페이지면 토스트 비활성화
  if (pathname.startsWith('/admin')) {
    return <>{children}</>
  }

  const showToast = (title: string, message: string) => {
    const id = Date.now()

    setToastList((prev) => [...prev, { id, title, message }])

    setTimeout(() => {
      setToastList((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* 🔔 전역 토스트 UI */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          zIndex: 99999,
        }}
      >
        {toastList.map((toast) => (
          <div
            key={toast.id}
            style={{
              minWidth: '260px',
              maxWidth: '320px',
              background: '#fff',
              padding: '14px 16px',
              borderRadius: '14px',
              boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ fontWeight: 700 }}>{toast.title}</div>
            <div style={{ fontSize: 13, color: '#555' }}>{toast.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('ToastProvider 안에서 사용해야 함')
  return ctx
}
