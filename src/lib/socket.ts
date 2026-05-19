import { io } from 'socket.io-client'

export const socket = io(process.env.NEXT_PUBLIC_API_URL!, {
  // ✅ websocket 실패 시 polling fallback
  transports: ['websocket', 'polling'],

  autoConnect: false,

  withCredentials: true,

  // ✅ 자동 재연결
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 3000,

  auth: {
    token:
      typeof window !== 'undefined'
        ? localStorage.getItem('accessToken')
        : null,
  },
})
