import { io } from 'socket.io-client'

export const socket = io(process.env.NEXT_PUBLIC_API_URL!, {
  transports: ['websocket'],
  autoConnect: false,

  withCredentials: true,

  auth: {
    token:
      typeof window !== 'undefined'
        ? localStorage.getItem('accessToken')
        : null,
  },
})
