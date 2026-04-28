'use client'

import React, { useEffect, useState, useRef } from 'react'
import { apiFetch } from '@/src/lib/apiFetch'
import PollMessage from '@/src/components/chat/PollMessage'
import AlertModal from '@/src/components/common/AlertModal'
import ConfirmModal from '@/src/components/common/ConfirmModal'

/* =========================
   타입 정의
========================= */

type ChatRoom = {
  id: number
  name: string
  isGroup: boolean
  lastMessage?: string
  unreadCount?: number
  participants?: UserSummary[]
}

type ChatMessage = {
  id: number
  roomId: number
  senderId: number
  senderName: string
  content: string
  createdAt: string
  type: 'text' | 'image' | 'file' | 'url' | 'notice' | 'poll' | 'video'
  fileUrl?: string
  fileName?: string
  readCount?: number
  pollData?: {
    title: string
    options: { id: number; text: string }[]
    anonymous: boolean
    closedAt?: string | null
  }

  preview?: {
    title?: string
    description?: string
    image?: string
  }

  pollResult?: {
    optionId: number
    count: number
    voters?: { id: number; name: string }[]
  }[]
}

type UserSummary = {
  id: number
  name: string
  username: string
  profileImageUrl?: string | null
  gradeLabel?: string // 예: "1학년 3반"
  isOwner?: boolean | number
}

type Friend = {
  id: number
  name: string
  username: string
  profileImageUrl?: string | null
  gradeLabel?: string
}
function getRoomDisplayName(
  room: ChatRoom,
  currentUserId?: number,
  participants?: UserSummary[],
) {
  // ✅ 변경된 방 이름 우선 표시
  if (room.name && room.name !== '새 그룹 채팅' && room.name !== '1:1 채팅') {
    return room.name
  }

  if (!participants || participants.length === 0) {
    return room.name
  }

  if (!room.isGroup) {
    const other = participants.find((p) => p.id !== currentUserId)
    return other?.name ?? room.name
  }

  const owner = participants.find((p) => p.isOwner)
  const others = participants.length - 1

  if (!owner) return room.name

  return others > 0 ? `${owner.name} 외에 ${others}명` : owner.name
}

// 한국 시간
function formatKST(value: string) {
  // 이미 사람이 읽는 형식이면 그대로
  if (/^(오전|오후)/.test(value)) return value

  // 🔥 ISO / UTC 기준으로 명확히 파싱
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Seoul',
  }).format(date)
}

function LinkPreview({ url, isMe }: { url: string; isMe?: boolean }) {
  const [preview, setPreview] = useState<any>(null)

  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedUser = localStorage.getItem('loggedInUser')
    if (!storedUser) return

    try {
      const parsed = JSON.parse(storedUser)
      const userId = parsed.id
      if (!userId) return

      const raw = localStorage.getItem(`theme_settings_${userId}`)
      if (!raw) return

      const settings = JSON.parse(raw)
      setDarkMode(Boolean(settings.darkMode))
    } catch {
      setDarkMode(false)
    }
  }, [])

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.darkMode !== undefined) {
        setDarkMode(e.detail.darkMode)
      }
    }

    window.addEventListener('theme-change', handler)
    return () => window.removeEventListener('theme-change', handler)
  }, [])

  useEffect(() => {
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then((res) => res.json())
      .then(setPreview)
      .catch(() => {})
  }, [url])

  const isMap = preview?.type === 'map'

  let mapTitle = preview?.title || ''
  let mapAddress = preview?.description || ''

  if (isMap && mapAddress) {
    const parts = mapAddress.split('·')
    if (parts.length > 1) {
      mapAddress = parts[parts.length - 1].trim()
    }
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      style={{
        textDecoration: 'none',
        display: 'block',
        maxWidth: 300,
      }}
    >
      <div
        style={{
          borderRadius: 14,
          overflow: 'hidden',
          background: darkMode ? '#1e293b' : 'white',
          border: darkMode ? '1px solid #334155' : '1px solid #e5e7eb',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        {preview?.image && (
          <div
            style={{
              width: '100%',
              height: 180,
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={preview.image}
              style={{
                width: '100%',
                height: 180,
                objectFit: 'cover',
              }}
            />
          </div>
        )}

        <div style={{ padding: 12 }}>
          {/* 지도 전용 뱃지 */}
          {isMap && (
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#2563eb',
                marginBottom: 6,
              }}
            >
              📍 위치 정보
            </div>
          )}

          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              marginBottom: 6,
              color: darkMode ? '#e5e7eb' : '#111827',
            }}
          >
            {isMap ? mapTitle : preview?.title || url}
          </div>

          {isMap && preview?.rating && (
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#f59e0b',
                marginBottom: 6,
              }}
            >
              ⭐ {preview.rating}
            </div>
          )}

          {isMap
            ? mapAddress && (
                <div
                  style={{
                    fontSize: 12,
                    color: darkMode ? '#94a3b8' : '#6b7280',
                    lineHeight: 1.4,
                    marginBottom: 6,
                  }}
                >
                  {mapAddress}
                </div>
              )
            : preview?.description && (
                <div
                  style={{
                    fontSize: 12,
                    color: darkMode ? '#94a3b8' : '#6b7280',
                    lineHeight: 1.4,
                    marginBottom: 6,
                  }}
                >
                  {preview.description}
                </div>
              )}

          {/* 도메인 표시 */}
          <div
            style={{
              fontSize: 11,
              color: darkMode ? '#64748b' : '#9ca3af',
            }}
          >
            {new URL(url).hostname}
          </div>
        </div>
      </div>
    </a>
  )
}

/* =========================
   메인 페이지 컴포넌트
========================= */

export default function ChatPage() {
  // 🚫 전학 / 학교 다름 차단 모달
  const [blockMessage, setBlockMessage] = useState<string | null>(null)

  //다크 모드
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedUser = localStorage.getItem('loggedInUser')
    if (!storedUser) return

    try {
      const parsed = JSON.parse(storedUser)
      const userId = parsed.id
      if (!userId) return

      const raw = localStorage.getItem(`theme_settings_${userId}`)
      if (!raw) return

      const settings = JSON.parse(raw)
      setDarkMode(Boolean(settings.darkMode))
    } catch {
      setDarkMode(false)
    }
  }, [])

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.darkMode !== undefined) {
        setDarkMode(e.detail.darkMode)
      }
    }

    window.addEventListener('theme-change', handler)
    return () => window.removeEventListener('theme-change', handler)
  }, [])

  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [currentRoomId, setCurrentRoomId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteMode, setInviteMode] = useState<'oneToOne' | 'group'>('oneToOne')

  const [isMobile, setIsMobile] = useState(false)

  const showRoomList = !isMobile || currentRoomId === null
  const showChatRoom = !isMobile || currentRoomId !== null

  const [showAttachMenu, setShowAttachMenu] = useState(false)

  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [sidebarWidth, setSidebarWidth] = useState(360) // 기본 폭
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isResizingRef = useRef<boolean>(false)
  const [isHoveringResize, setIsHoveringResize] = useState(false)

  const [openRoomMenuId, setOpenRoomMenuId] = useState<number | null>(null)

  const [showRoomMenu, setShowRoomMenu] = useState(false)
  const [roomUsers, setRoomUsers] = useState<UserSummary[]>([])
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [pendingImages, setPendingImages] = useState<File[]>([])

  const [showNoticeModal, setShowNoticeModal] = useState(false)

  const [hideNotice, setHideNotice] = useState(false)

  const [showPollModal, setShowPollModal] = useState(false)

  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [canDownloadPreview, setCanDownloadPreview] = useState(true)

  const [friends, setFriends] = useState<Friend[]>([])
  const [blockedIds, setBlockedIds] = useState<number[]>([])
  const [showFriendsModal, setShowFriendsModal] = useState(false)

  const isBlockedChat = Boolean(blockMessage)

  const [isChatBanned, setIsChatBanned] = useState(false)

  const [friendsModalMode, setFriendsModalMode] = useState<'chat' | 'invite'>(
    'chat',
  )

  const [reportMode, setReportMode] = useState(false)
  const [reportTarget, setReportTarget] = useState<ChatMessage | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)

  const [alert, setAlert] = useState<{
    open: boolean
    title?: string
    message: string
  }>({ open: false, message: '' })

  const [confirm, setConfirm] = useState<{
    open: boolean
    title?: string
    message: string
    danger?: boolean
    onConfirm?: () => void
  }>({ open: false, message: '' })

  const [renameModal, setRenameModal] = useState<{
    open: boolean
    roomId: number | null
    name: string
  }>({
    open: false,
    roomId: null,
    name: '',
  })

  // 🔥 최신 공지 1개 추출
  const latestNotice = messages
    .filter((m) => m.roomId === currentRoomId && m.type === 'notice')
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0]

  const COLORS = {
    primary: '#4FC3F7',

    bg: darkMode ? '#0f172a' : '#f9fafb',
    border: darkMode ? '#334155' : '#e5e7eb',

    text: darkMode ? '#e5e7eb' : '#111827',
    subText: darkMode ? '#94a3b8' : '#6b7280',

    noticeBg: darkMode ? '#3f3f1d' : '#FEF3C7',
    noticeText: darkMode ? '#fde68a' : '#92400E',
    softBg: darkMode ? '#334155' : '#f3f4f6',
  }

  const EMOJIS = [
    '😀',
    '😂',
    '😍',
    '🥰',
    '😎',
    '😭',
    '😡',
    '👍',
    '👏',
    '🙏',
    '🔥',
    '🎉',
    '❤️',
    '💯',
  ]

  async function safeJson<T>(res: Response): Promise<T | null> {
    if (!res.ok) return null

    const text = await res.text()
    if (!text) return null

    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  }

  const [showRoomUsers, setShowRoomUsers] = useState(false)

  const fetchRoomUsers = async () => {
    if (!currentRoomId || !currentUser?.token) return

    const res = await apiFetch(`/api/chat/messages/${currentRoomId}/users`)

    if (!res.ok) {
      setBlockMessage('참여자 정보를 불러오지 못했습니다.')
      return
    }

    const data = await res.json()
    setRoomUsers(Array.isArray(data) ? data : [])
    setShowRoomUsers(true)
  }

  const handleCreateRoom = async (
    mode: 'oneToOne' | 'group',
    userIds: number[],
  ) => {
    if (!currentUser?.token) return

    const res = await apiFetch('/api/chat/create-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isGroup: mode === 'group',
        name: mode === 'group' ? '새 그룹 채팅' : '1:1 채팅',
        userIds,
      }),
    })

    /* 🔥 1️⃣ 채팅 정지 */
    if (res.status === 403) {
      const err = await res.json().catch(() => ({}))

      if (err.message === 'CHAT_BANNED') {
        setBlockMessage(
          `채팅 이용이 제한되었습니다.\n정지 해제 시간: ${formatKST(err.banUntil)}`,
        )
        return
      }

      if (err.message === 'CHAT_BANNED_PERMANENT') {
        setBlockMessage('계정이 정지되어 채팅방을 만들 수 없습니다.')
        return
      }

      setBlockMessage('채팅 이용이 제한되어 채팅방을 만들 수 없습니다.')
      return
    }

    /* 🔥 2️⃣ 이미 존재하는 1:1 채팅 */
    if (res.status === 409) {
      const data = await res.json()

      setConfirm({
        open: true,
        title: '이미 채팅방이 존재합니다',
        message:
          data.message ||
          '이미 해당 사용자와의 채팅방이 있습니다.\n기존 채팅방으로 이동할까요?',
        onConfirm: async () => {
          setShowInviteModal(false)
          setCurrentRoomId(data.roomId)

          const listRes = await apiFetch('/api/chat/rooms')
          const list = await listRes.json()
          setRooms(Array.isArray(list) ? list : [])
        },
      })

      return
    }

    /* 🔥 3️⃣ 기타 에러 */
    if (!res.ok) {
      setBlockMessage('채팅방 생성 실패')
      return
    }

    /* ✅ 4️⃣ 정상 생성 */
    const data = await res.json()

    setShowInviteModal(false)
    setCurrentRoomId(data.roomId)

    const listRes = await apiFetch('/api/chat/rooms')
    const list = await listRes.json()
    setRooms(Array.isArray(list) ? list : [])
  }

  // =======================
  // 채팅방 나가기
  // =======================
  const handleLeaveRoom = async () => {
    if (!currentRoomId || !currentUser?.token) return

    setConfirm({
      open: true,
      title: '채팅방 나가기',
      message: '채팅방을 나가시겠습니까?',
      onConfirm: async () => {
        const res = await apiFetch(
          `/api/chat/messages/${currentRoomId}/leave`,
          { method: 'POST' },
        )

        if (!res.ok) {
          setAlert({
            open: true,
            title: '오류',
            message: '채팅방 나가기 실패',
          })
          return
        }

        setCurrentRoomId(null)
        setMessages([])

        const listRes = await apiFetch('/api/chat/rooms')
        const data = await safeJson<ChatRoom[]>(listRes)
        setRooms(Array.isArray(data) ? data : [])
      },
    })
  }

  // =======================
  // 채팅방 삭제
  // =======================
  const handleDeleteRoom = () => {
    if (!currentRoomId || !currentUser?.token) return

    setConfirm({
      open: true,
      title: '채팅방 삭제',
      message: '채팅방을 삭제하면 복구할 수 없습니다.\n정말 삭제하시겠습니까?',
      danger: true,
      onConfirm: async () => {
        const res = await apiFetch(
          `/api/chat/messages/${currentRoomId}/delete`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              roomId: currentRoomId,
            }),
          },
        )

        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          setBlockMessage(data.message || '채팅방 삭제에 실패했습니다.')
          return
        }

        setCurrentRoomId(null)
        setMessages([])

        const listRes = await apiFetch('/api/chat/rooms')
        const listData = await listRes.json()
        setRooms(Array.isArray(listData) ? listData : [])
      },
    })
  }

  const handleRenameRoom = (roomId?: number) => {
    const targetRoomId = roomId ?? currentRoomId
    if (!targetRoomId) return

    const targetRoom = rooms.find((r) => r.id === targetRoomId)

    setRenameModal({
      open: true,
      roomId: targetRoomId,
      name:
        targetRoom?.name &&
        targetRoom.name !== '새 그룹 채팅' &&
        targetRoom.name !== '1:1 채팅'
          ? targetRoom.name
          : '',
    })
  }

  const submitRenameRoom = async () => {
    if (!renameModal.roomId || !currentUser?.token) return

    const trimmedName = renameModal.name.trim()

    if (!trimmedName) {
      setAlert({
        open: true,
        title: '입력 필요',
        message: '채팅방 이름을 입력하세요.',
      })
      return
    }

    const res = await apiFetch(
      `/api/chat/messages/${renameModal.roomId}/name`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      },
    )

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setBlockMessage(data.message || '이름 변경 실패')
      return
    }

    setRooms((prev) =>
      prev.map((room) =>
        room.id === renameModal.roomId ? { ...room, name: trimmedName } : room,
      ),
    )

    setRenameModal({
      open: false,
      roomId: null,
      name: '',
    })
  }
  const handleSendImage = async (file: File) => {
    if (!currentRoomId || !currentUser?.token) return

    const formData = new FormData()
    formData.append('file', file)

    // 1. S3 업로드
    const uploadRes = await fetch('/api/upload/chat', {
      method: 'POST',
      body: formData,
    })

    if (!uploadRes.ok) {
      setBlockMessage('이미지 업로드 실패')
      return
    }

    const { url, name } = await uploadRes.json()

    // 2. 메시지 저장
    await apiFetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: currentRoomId,
        type: 'image',
        fileUrl: url,
        fileName: name,
      }),
    })

    // 3. 메시지 다시 불러오기
    const res = await apiFetch(`/api/chat/messages/${currentRoomId}`)

    const data = await safeJson<ChatMessage[]>(res)
    setMessages(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }

    setVh()
    window.addEventListener('resize', setVh)
    return () => window.removeEventListener('resize', setVh)
  }, [])

  useEffect(() => {
    if (showEmojiPicker) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
  }, [showEmojiPicker])

  function isUrl(text: string) {
    try {
      const url = new URL(text)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }

  // 현재 로그인 유저 (localStorage에서 가져오는 패턴 유지)
  const [currentUser, setCurrentUser] = useState<{
    id?: number
    name?: string
    school?: string
    schoolCode?: string
    token?: string
  } | null>(null)

  useEffect(() => {
    const checkBanStatus = async () => {
      if (!currentUser?.token) return

      const res = await apiFetch('/api/auth/me')

      // 🔴 정지 상태
      if (res.status === 403) {
        const data = await res.json()

        setIsChatBanned(true)

        if (data.type === 'temporary') {
          setBlockMessage(
            `채팅 이용이 제한되었습니다.\n${
              data.reason ?? ''
            }\n\n정지 해제 시간: ${formatKST(data.banUntil)}`,
          )
        } else {
          setBlockMessage(`계정이 영구 정지되었습니다.\n${data.reason ?? ''}`)
        }
        return
      }

      // ❌ 진짜 인증 실패
      if (res.status === 401) {
        setAlert({
          open: true,
          title: '로그인 만료',
          message: '로그인이 만료되었습니다.\n다시 로그인해주세요.',
        })

        localStorage.removeItem('loggedInUser')
        location.href = '/login'
      }
    }

    checkBanStatus()
  }, [currentUser])

  const fetchFriends = async () => {
    const res = await apiFetch('/api/friends')
    const data = await safeJson<Friend[]>(res)
    setFriends(Array.isArray(data) ? data : [])
  }

  const fetchBlocks = async () => {
    const res = await apiFetch('/api/friends/blocks')
    const data = await safeJson<{ blocked_id: number }[]>(res)
    setBlockedIds(Array.isArray(data) ? data.map((b) => b.blocked_id) : [])
  }

  useEffect(() => {
    if (!currentUser?.token) return
    fetchFriends()
    fetchBlocks()
  }, [currentUser])

  const handleAddFriend = async (friendId: number) => {
    const res = await apiFetch('/api/friends/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendId }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))

      setAlert({
        open: true,
        title: '친구 추가 실패',
        message: err.message || '친구 추가에 실패했습니다.',
      })
      return
    }

    // 🔥 즉시 친구 목록 다시 불러오기
    await fetchFriends()
  }

  const handleDeleteFriend = async (friendId: number) => {
    setConfirm({
      open: true,
      title: '친구 삭제',
      message: '친구를 삭제하시겠습니까?',
      danger: true,
      onConfirm: async () => {
        const res = await apiFetch(`/api/friends/${friendId}`, {
          method: 'DELETE',
        })

        if (!res.ok) {
          setAlert({
            open: true,
            title: '오류',
            message: '친구 삭제 실패',
          })
          return
        }

        setFriends((prev) => prev.filter((f) => f.id !== friendId))
      },
    })
  }

  const handleToggleBlock = async (targetId: number) => {
    const res = await apiFetch('/api/friends/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockedId: targetId }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setAlert({
        open: true,
        title: '차단 처리 실패',
        message: data.message || '차단 처리에 실패했습니다.',
      })
      return
    }

    if (data.blocked) {
      // 차단됨 → 친구 목록에서도 제거
      setBlockedIds((prev) => [...prev, targetId])
      setFriends((prev) => prev.filter((f) => f.id !== targetId))
    } else {
      // 차단 해제
      setBlockedIds((prev) => prev.filter((id) => id !== targetId))
    }
  }

  const messageContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = messageContainerRef.current
    if (!container) return

    const threshold = 80

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold

    // 🔥 처음 로드 or 아래 근처일 때
    if (isNearBottom) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    const container = messageContainerRef.current
    if (!container) return

    setTimeout(() => {
      container.scrollTop = container.scrollHeight
    }, 0)
  }, [currentRoomId])

  /* -------------------------
   로그인 유저 로드
------------------------- */
  useEffect(() => {
    const stored = localStorage.getItem('loggedInUser')
    if (!stored) return

    try {
      const parsed = JSON.parse(stored)
      setCurrentUser({
        id: parsed.id,
        name: parsed.name,
        school: parsed.school,
        schoolCode: parsed.schoolCode,
        token: parsed.token,
      })
    } catch {
      setCurrentUser(null)
    }
  }, [])

  /* -------------------------
   채팅방 목록 불러오기 (🔥 필수)
------------------------- */
  useEffect(() => {
    apiFetch('/api/chat/rooms')
      .then((res) => safeJson<ChatRoom[]>(res))
      .then((data) => setRooms(Array.isArray(data) ? data : []))
      .catch(() => setRooms([]))
  }, [])

  // 메시지 바닥으로 스크롤

  // 모바일 웹
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // mouse 이벤트 핸들러
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return

      const containerLeft =
        containerRef.current?.getBoundingClientRect().left ?? 0

      const newWidth = e.clientX - containerLeft

      // 최소 / 최대 폭 제한
      if (newWidth < 240 || newWidth > 520) return

      setSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      isResizingRef.current = false
      document.body.style.cursor = 'default'
      document.body.style.userSelect = 'auto'
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  /* -------------------------
     현재 방, 메시지 필터링
  ------------------------- */
  const currentRoom = rooms.find((r) => r.id === currentRoomId) || null
  const roomMessages = messages
    .filter((m) => m.roomId === currentRoomId)
    .filter((m) => m.type !== 'notice') // 🔥 공지 제외

  const handleSendImagesBulk = async () => {
    if (isChatBanned) return
    if (!currentRoomId || !currentUser?.token) return

    const uploaded: { fileUrl: string; fileName: string }[] = []

    // 1️⃣ 이미지 업로드
    for (const file of pendingImages) {
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/upload/chat', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) continue

      const { url, name } = await uploadRes.json()
      uploaded.push({ fileUrl: url, fileName: name })
    }

    if (uploaded.length === 0) return

    // 2️⃣ 메시지 저장 (🔥 여기 핵심)
    const sendRes = await apiFetch('/api/chat/messages/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: currentRoomId,
        images: uploaded,
      }),
    })

    /* 🔥 전학 / 학교 다름 차단 */
    if (!sendRes.ok) {
      const err = await sendRes.json().catch(() => ({}))

      if (sendRes.status === 403) {
        if (err?.message === 'CHAT_BANNED') {
          const until = err.banEnd
            ? `\n정지 해제 시간: ${formatKST(err.banEnd)}`
            : ''

          setBlockMessage(`채팅 이용이 제한되었습니다.${until}`)
        } else {
          setBlockMessage(
            err.message ??
              '학교가 달라져 더 이상 이 채팅방에서 이미지를 보낼 수 없습니다.',
          )
        }
        return
      }

      // ❗ 업로드 대기 이미지 유지 (사용자가 지울 수 있게)
      return
    }

    // 3️⃣ 성공한 경우만 UI 정리
    setPendingImages([])

    // 4️⃣ 메시지 새로 불러오기
    const res = await apiFetch(`/api/chat/messages/${currentRoomId}`)
    const data = await safeJson<ChatMessage[]>(res)
    setMessages(Array.isArray(data) ? data : [])
  }

  /* -------------------------
     메시지 전송 핸들러
  ------------------------- */
  const handleSendMessage = async () => {
    if (isChatBanned) return
    if (!currentRoomId) return

    /* ======================
     🖼 이미지 먼저 전송
  ====================== */
    if (pendingImages.length > 0) {
      await handleSendImagesBulk()
      return
    }

    /* ======================
     ✏️ 텍스트 메시지
  ====================== */
    if (!inputText.trim()) return

    const trimmed = inputText.trim()

    const newMessage: ChatMessage = {
      id: Date.now(),
      roomId: currentRoomId,
      senderId: currentUser?.id || 0,
      senderName: currentUser?.name || '나',
      content: trimmed,
      createdAt: new Date().toISOString(),
      type: isUrl(trimmed) ? 'url' : 'text',
    }

    // 🔹 optimistic UI
    setMessages((prev) => [...prev, newMessage])
    setInputText('')

    setTimeout(() => {
      const container = messageContainerRef.current
      if (!container) return
      container.scrollTop = container.scrollHeight
    }, 0)

    const sendRes = await apiFetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: currentRoomId,
        type: newMessage.type,
        content: newMessage.content,
      }),
    })

    /* 🔥 전학 등으로 차단된 경우 */
    if (!sendRes.ok) {
      const err = await sendRes.json().catch(() => ({}))

      if (sendRes.status === 403) {
        if (err?.message === 'CHAT_BANNED') {
          const until = err.banEnd
            ? `\n정지 해제 시간: ${formatKST(err.banEnd)}`
            : ''

          setBlockMessage(`채팅 이용이 제한되었습니다.${until}`)
        } else {
          setBlockMessage(
            err.message ??
              '학교가 달라져 더 이상 이 채팅방에서 메시지를 보낼 수 없습니다.',
          )
        }

        // optimistic 메시지 제거
        setMessages((prev) => prev.filter((m) => m.id !== newMessage.id))
        return
      }

      setBlockMessage(err.message || '메시지 전송에 실패했습니다.')

      // 실패 시 optimistic 메시지 제거
      setMessages((prev) => prev.filter((m) => m.id !== newMessage.id))
      return
    }

    /* ✅ 성공한 경우만 메시지 다시 불러오기 */
    const res = await apiFetch(`/api/chat/messages/${currentRoomId}`)
    const data = await safeJson<ChatMessage[]>(res)
    setMessages(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    if (!currentRoomId) return

    const fetchMessages = async () => {
      const res = await apiFetch(`/api/chat/messages/${currentRoomId}`)
      const data = await safeJson<ChatMessage[]>(res)
      setMessages(Array.isArray(data) ? data : [])
    }

    // 처음 1회 실행
    fetchMessages()

    // 3초마다 반복
    const interval = setInterval(fetchMessages, 3000)

    // 방 바뀌거나 컴포넌트 언마운트 시 정리
    return () => clearInterval(interval)
  }, [currentRoomId])

  /* -------------------------
     파일 선택 핸들러 (UI만)
  ------------------------- */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return

    const files = Array.from(e.target.files)

    for (const file of files) {
      // 🖼 이미지
      if (file.type.startsWith('image/')) {
        setPendingImages((prev) => [...prev, file])
      }

      // 🎥 동영상
      else if (file.type.startsWith('video/')) {
        await handleSendVideo(file)
      }

      // 📄 문서 파일
      else {
        await handleSendFile(file)
      }
    }

    e.target.value = ''
  }

  const handleClearFiles = () => setUploadingFiles([])

  /* -------------------------
     채팅방 생성 버튼 (UI만)
  ------------------------- */
  const handleCreateOneToOne = () => {
    setInviteMode('oneToOne')
    setShowInviteModal(true)
  }

  const handleCreateGroup = () => {
    setInviteMode('group')
    setShowInviteModal(true)
  }

  const handleDeleteMessage = async (messageId: number) => {
    setConfirm({
      open: true,
      title: '메시지 삭제',
      message: '이 메시지를 삭제하시겠습니까?',
      danger: true,
      onConfirm: async () => {
        const res = await apiFetch(`/api/chat/messages/delete/${messageId}`, {
          method: 'DELETE',
        })

        if (!res.ok) {
          setAlert({
            open: true,
            title: '오류',
            message: '메시지 삭제 실패',
          })
          return
        }

        const list = await apiFetch(`/api/chat/messages/${currentRoomId}`)
        const data = await safeJson<ChatMessage[]>(list)
        setMessages(Array.isArray(data) ? data : [])
      },
    })
  }

  const handleSendFile = async (file: File) => {
    if (isChatBanned) return
    if (!currentRoomId || !currentUser?.token) return

    const formData = new FormData()
    formData.append('file', file)

    /* =====================
     1️⃣ S3 업로드
  ===================== */
    const uploadRes = await fetch('/api/upload/chat', {
      method: 'POST',
      body: formData,
    })

    if (!uploadRes.ok) {
      setBlockMessage('파일 업로드 실패')
      return
    }

    const { url, name } = await uploadRes.json()

    /* =====================
     2️⃣ 메시지 저장 (🔥 핵심)
  ===================== */
    const sendRes = await apiFetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: currentRoomId,
        type: 'file',
        fileUrl: url,
        fileName: name,
      }),
    })

    /* 🔥 전학 / 학교 다름 차단 */
    if (!sendRes.ok) {
      const err = await sendRes.json().catch(() => ({}))

      if (err?.message === 'CHAT_BANNED') {
        setBlockMessage(
          `채팅 이용이 제한되었습니다.\n정지 해제 시간: ${formatKST(err.banEnd)}`,
        )
        return
      }

      setBlockMessage(err.message || '파일 전송에 실패했습니다.')
      return
    }

    /* =====================
     3️⃣ 성공 시 메시지 갱신
  ===================== */
    const res = await apiFetch(`/api/chat/messages/${currentRoomId}`)
    const data = await safeJson<ChatMessage[]>(res)
    setMessages(Array.isArray(data) ? data : [])
  }

  const handleSendVideo = async (file: File) => {
    if (isChatBanned) return
    if (!currentRoomId || !currentUser?.token) return

    const formData = new FormData()
    formData.append('file', file)

    // 1️⃣ S3 업로드
    const uploadRes = await fetch('/api/upload/chat', {
      method: 'POST',
      body: formData,
    })

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}))

      if (err?.error === 'FILE_TOO_LARGE') {
        setAlert({
          open: true,
          title: '업로드 제한',
          message: '100MB 이상 영상은 업로드할 수 없습니다.',
        })
        return
      }

      setBlockMessage('동영상 업로드 실패')
      return
    }
    const { url, name } = await uploadRes.json()

    // 2️⃣ 메시지 저장
    const sendRes = await apiFetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: currentRoomId,
        type: 'video', // 🔥 핵심
        fileUrl: url,
        fileName: name,
      }),
    })

    if (!sendRes.ok) {
      setBlockMessage('동영상 전송 실패')
      return
    }

    // 3️⃣ 메시지 갱신
    const res = await apiFetch(`/api/chat/messages/${currentRoomId}`)
    const data = await safeJson<ChatMessage[]>(res)
    setMessages(Array.isArray(data) ? data : [])
  }

  const handleDeleteNotice = async (noticeId: number) => {
    setConfirm({
      open: true,
      title: '공지 삭제',
      message: '이 공지를 삭제하시겠습니까?',
      danger: true,
      onConfirm: async () => {
        const res = await apiFetch(`/api/chat/notice/${noticeId}`, {
          method: 'DELETE',
        })

        if (!res.ok) {
          setAlert({
            open: true,
            title: '오류',
            message: '공지 삭제 실패',
          })
          return
        }

        const list = await apiFetch(`/api/chat/messages/${currentRoomId}`)
        const data = await safeJson<ChatMessage[]>(list)
        setMessages(Array.isArray(data) ? data : [])
      },
    })
  }

  return (
    <main
      ref={containerRef}
      style={{
        height: 'calc(var(--vh, 1vh) * 100)',
        paddingTop: isMobile ? 60 : 0, // 가독성도 좋아짐
        paddingBottom: 0, // ✅ 아래 여백 완전 제거
        background: darkMode ? '#0f172a' : '#ffffff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'stretch',
        overflow: 'hidden',
        overflowX: 'hidden',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          height: isMobile
            ? 'calc(var(--vh, 1vh) * 100 - 60px)'
            : 'calc(var(--vh, 1vh) * 100)',
          borderRadius: 0, // ✅ 둥근 모서리 제거
          display: 'flex',
          overflow: 'hidden',
          background: darkMode ? '#1e293b' : 'white',
          boxShadow: 'none', // ✅ 그림자 제거 (카드 느낌 X)
        }}
      >
        {/* ================= 좌측: 채팅 리스트 ================= */}
        {showRoomList && (
          <aside
            style={{
              width: isMobile ? '100%' : sidebarWidth,
              minWidth: 240,
              maxWidth: 520,
              borderRight: isMobile ? 'none' : `1px solid ${COLORS.border}`,
              background: darkMode ? '#1e293b' : 'white',
              color: COLORS.text,
              display: 'flex',
              flexDirection: 'column',
              overflowX: 'hidden',
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderBottom: `1px solid ${COLORS.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>학교 채팅</span>

                <button
                  onClick={() => {
                    setFriendsModalMode('chat')
                    setShowFriendsModal(true)
                  }}
                  style={{
                    fontSize: 12,
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: `1px solid ${COLORS.border}`,
                    background: darkMode ? '#1e293b' : 'white',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  👥 친구
                </button>
              </div>

              <span style={{ fontSize: 12, color: COLORS.subText }}>
                {currentUser?.school
                  ? `📚 ${currentUser.school}`
                  : '로그인한 학교 기준으로만 채팅 가능'}
              </span>
            </div>

            <div
              style={{
                padding: '10px 10px 0',
                display: 'flex',
                gap: 8,
                borderBottom: `1px solid ${COLORS.border}`,
                paddingBottom: 10,
              }}
            >
              <button
                type="button"
                onClick={handleCreateOneToOne}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: '#4FC3F7',
                  color: 'white',
                }}
              >
                1:1 채팅
              </button>
              <button
                type="button"
                onClick={handleCreateGroup}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: '#6366f1',
                  color: 'white',
                }}
              >
                그룹 채팅
              </button>
            </div>
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
              }}
            >
              {rooms.map((room) => {
                const isActive = room.id === currentRoomId
                return (
                  <div
                    key={room.id}
                    role="button"
                    tabIndex={0}
                    onClick={async () => {
                      setCurrentRoomId(room.id)

                      // 🔥 먼저 강제로 맨 아래 보내기 (UI 초기화 느낌)
                      setTimeout(() => {
                        const container = messageContainerRef.current
                        if (!container) return
                        container.scrollTop = container.scrollHeight
                      }, 0)

                      if (!currentUser?.token) return

                      await apiFetch(`/api/chat/messages/${room.id}/read`, {
                        method: 'POST',
                      })

                      const res = await apiFetch(
                        `/api/chat/messages/${room.id}`,
                      )
                      const data = await safeJson<ChatMessage[]>(res)

                      setMessages(Array.isArray(data) ? data : [])

                      // 🔥 메시지 로딩 후 한번 더 (핵심)
                      setTimeout(() => {
                        const container = messageContainerRef.current
                        if (!container) return
                        container.scrollTop = container.scrollHeight
                      }, 0)
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderBottom: `1px solid ${COLORS.border}`,
                      cursor: 'pointer',
                      background: isActive
                        ? darkMode
                          ? '#1e3a5f'
                          : '#eff6ff'
                        : darkMode
                          ? '#1e293b'
                          : 'white',

                      color: COLORS.text,
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 2,
                      }}
                    >
                      {/* 방 이름 */}
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          color: COLORS.text,
                          flex: 1,
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {getRoomDisplayName(
                          room,
                          currentUser?.id,
                          room.participants,
                        )}

                        {Number(room.unreadCount) > 0 && (
                          <span
                            style={{
                              minWidth: 18,
                              height: 18,
                              padding: '0 6px',
                              borderRadius: 999,
                              background: '#ef4444',
                              color: 'white',
                              fontSize: 11,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {Number(room.unreadCount) > 99
                              ? '99+'
                              : Number(room.unreadCount)}
                          </span>
                        )}
                      </span>

                      {/* ⋮ 메뉴 */}
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenRoomMenuId(
                              openRoomMenuId === room.id ? null : room.id,
                            )
                          }}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            fontSize: 18,
                            cursor: 'pointer',
                            color: COLORS.text,
                            padding: '2px 15px',
                            position: 'relative',
                            top: -16,
                            lineHeight: 1,
                          }}
                        >
                          ⋯
                        </button>

                        {/* 드롭다운 */}
                        {openRoomMenuId === room.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: 'absolute',
                              left: 0, // ⭐ 기준 변경
                              top: 2, // ⭐ 버튼 아래로
                              transform: 'translateX(-73%)', // ⭐ 버튼 왼쪽으로
                              background: darkMode ? '#1e293b' : 'white',
                              borderRadius: 8,
                              boxShadow: '0 6px 18px rgba(0,0,0,0.15)',
                              border: darkMode
                                ? '1px solid #334155'
                                : '1px solid #e5e7eb',
                              zIndex: 50,
                              minWidth: 120,
                            }}
                          >
                            <MenuItem
                              label="🚪 나가기"
                              onClick={() => {
                                setOpenRoomMenuId(null)
                                setCurrentRoomId(room.id)
                                handleLeaveRoom()
                              }}
                            />
                            <MenuItem
                              label="🗑 삭제"
                              danger
                              onClick={() => {
                                setOpenRoomMenuId(null)
                                setCurrentRoomId(room.id)
                                handleDeleteRoom()
                              }}
                            />
                            <MenuItem
                              label="✏️ 이름 변경"
                              onClick={() => {
                                setOpenRoomMenuId(null)
                                handleRenameRoom(room.id)
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <p
                      style={{
                        fontSize: 12,
                        color: COLORS.subText,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {room.lastMessage || '메시지가 없습니다.'}
                    </p>
                  </div>
                )
              })}
            </div>
          </aside>
        )}

        {/* PC 전용 리사이즈 핸들 */}
        {!isMobile && showRoomList && showChatRoom && (
          <div
            onMouseDown={() => {
              isResizingRef.current = true
              document.body.style.cursor = 'col-resize'
              document.body.style.userSelect = 'none'
            }}
            onMouseEnter={() => setIsHoveringResize(true)}
            onMouseLeave={() => setIsHoveringResize(false)}
            style={{
              width: 8,
              cursor: 'col-resize',
              background:
                isHoveringResize || isResizingRef.current
                  ? '#bfdbfe'
                  : '#e5e7eb',
              flexShrink: 0,
              position: 'relative',
              transition: 'background 0.15s ease',
            }}
          >
            {/* 가운데 라인 시각 강조 */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '50%',
                width: isHoveringResize || isResizingRef.current ? 3 : 1,
                background:
                  isHoveringResize || isResizingRef.current
                    ? '#2563eb'
                    : 'transparent', // ✅ 평소엔 안 보이게
                transform: 'translateX(-50%)',
                transition: 'all 0.15s ease',
              }}
            />
          </div>
        )}

        {/* ================= 우측: 채팅 창 ================= */}
        {showChatRoom && (
          <section
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
            }}
          >
            {/* 헤더 */}
            <div
              style={{
                padding: '10px 16px',
                borderBottom: `1px solid ${COLORS.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              {currentRoom && (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowRoomMenu((v) => !v)}
                    style={{
                      border: 'none',
                      background: COLORS.softBg,
                      borderRadius: 8,
                      padding: '6px 10px',
                      fontSize: 16,
                      cursor: 'pointer',
                    }}
                  >
                    ☰
                  </button>

                  {showRoomMenu && (
                    <div
                      style={{
                        position: 'absolute',
                        right: -130,
                        top: '110%',
                        background: darkMode ? '#1e293b' : 'white',
                        borderRadius: 10,
                        boxShadow: '0 6px 18px rgba(0,0,0,0.15)',
                        borderTop: `1px solid ${COLORS.border}`,
                        zIndex: 100,
                        minWidth: 160,
                      }}
                    >
                      <MenuItem
                        label="👥 참여자 보기"
                        onClick={() => {
                          setShowRoomMenu(false)
                          fetchRoomUsers()
                        }}
                      />
                      <MenuItem
                        label="📢 공지 작성"
                        onClick={() => {
                          if (isChatBanned) {
                            setBlockMessage(
                              '채팅 이용이 제한되어 공지를 작성할 수 없습니다.',
                            )
                            return
                          }
                          setShowRoomMenu(false)
                          setShowNoticeModal(true)
                        }}
                      />

                      <MenuItem
                        label={
                          currentRoom?.isGroup ? '➕ 초대' : '👥 그룹으로 전환'
                        }
                        onClick={() => {
                          setShowRoomMenu(false)
                          setFriendsModalMode('invite')
                          setShowFriendsModal(true)
                        }}
                      />

                      <MenuItem
                        label="🚨 메시지 신고"
                        danger
                        onClick={() => {
                          setShowRoomMenu(false)
                          setReportMode(true)

                          setAlert({
                            open: true,
                            title: '메시지 신고',
                            message: '신고할 메시지를 선택하세요.',
                          })
                        }}
                      />

                      <MenuItem
                        label="🚪 나가기"
                        onClick={() => {
                          if (isChatBanned) {
                            setBlockMessage(
                              '채팅 이용이 제한되어 채팅방 관리를 할 수 없습니다.',
                            )
                            return
                          }
                          setShowRoomMenu(false)
                          handleLeaveRoom() // or handleDeleteRoom()
                        }}
                      />
                      <MenuItem
                        label="🗑 삭제"
                        danger
                        onClick={() => {
                          if (isChatBanned) {
                            setBlockMessage(
                              '채팅 이용이 제한되어 채팅방 관리를 할 수 없습니다.',
                            )
                            return
                          }
                          setShowRoomMenu(false)
                          handleLeaveRoom() // or handleDeleteRoom()
                        }}
                      />
                    </div>
                  )}

                  {showNoticeModal && (
                    <div
                      style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                      }}
                      onClick={() => setShowNoticeModal(false)}
                    >
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: '92%',
                          maxWidth: 420,
                          background: darkMode ? '#1e293b' : 'white',
                          borderRadius: 16,
                          padding: 20,
                        }}
                      >
                        <h3
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            marginBottom: 10,
                          }}
                        >
                          📢 공지 작성
                        </h3>

                        <textarea
                          placeholder="채팅방 공지를 입력하세요"
                          rows={4}
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          style={{
                            width: '93%',
                            padding: '12px',
                            borderRadius: 10,
                            border: `1px solid ${COLORS.border}`,
                            background: COLORS.bg,
                            color: COLORS.text,
                            fontSize: 14,
                            resize: 'none',
                            outline: 'none',
                          }}
                        />

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 8,
                            marginTop: 14,
                          }}
                        >
                          <button
                            onClick={() => {
                              setInputText('')
                              setShowNoticeModal(false)
                            }}
                            style={{
                              padding: '8px 14px',
                              borderRadius: 999,
                              border: `1px solid ${COLORS.border}`,
                              background: darkMode ? '#1e293b' : 'white',
                              cursor: 'pointer',
                            }}
                          >
                            취소
                          </button>

                          <button
                            onClick={async () => {
                              if (!inputText.trim() || !currentRoomId) return

                              const res = await apiFetch('/api/chat/messages', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  roomId: currentRoomId,
                                  type: 'notice',
                                  content: inputText.trim(),
                                }),
                              })

                              /* 🔥 전학 / 학교 다름 차단 */
                              if (!res.ok) {
                                const err = await res.json().catch(() => ({}))

                                if (res.status === 403) {
                                  setBlockMessage(
                                    err.message ??
                                      '학교가 달라져 이 채팅방에는 공지를 작성할 수 없습니다.',
                                  )
                                  return
                                }

                                setAlert({
                                  open: true,
                                  title: '공지 등록 실패',
                                  message:
                                    err.message || '공지 등록에 실패했습니다.',
                                })
                                return
                              }

                              /* ✅ 성공한 경우만 */
                              setInputText('')
                              setShowNoticeModal(false)

                              const listRes = await apiFetch(
                                `/api/chat/messages/${currentRoomId}`,
                              )
                              const data =
                                await safeJson<ChatMessage[]>(listRes)
                              setMessages(Array.isArray(data) ? data : [])
                            }}
                            style={{
                              padding: '8px 16px',
                              borderRadius: 999,
                              border: 'none',
                              background: COLORS.primary,
                              color: 'white',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            등록
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isMobile && currentRoom && (
                  <button
                    onClick={() => setCurrentRoomId(null)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      fontSize: 18,
                      cursor: 'pointer',
                    }}
                  >
                    ←
                  </button>
                )}

                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    {currentRoom
                      ? getRoomDisplayName(
                          currentRoom,
                          currentUser?.id,
                          currentRoom.participants,
                        )
                      : '채팅방을 선택하세요'}
                  </div>
                  {currentRoom && (
                    <div style={{ fontSize: 12, color: COLORS.subText }}>
                      {currentRoom.isGroup ? '그룹 채팅' : '1:1 채팅'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 메시지 영역 */}
            <div
              ref={messageContainerRef} // 🔥 여기로 이동
              style={{
                flex: 1,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                background: darkMode ? '#0f172a' : '#f9fafb',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {latestNotice && hideNotice && (
                  <button
                    onClick={() => setHideNotice(false)}
                    style={{
                      marginBottom: 8,
                      fontSize: 12,
                      color: '#2563eb',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    📢 공지 펼치기
                  </button>
                )}

                {/* 📢 상단 고정 공지 (최신 1개) */}
                {currentRoom && latestNotice && !hideNotice && (
                  <div
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,

                      background: COLORS.noticeBg,
                      color: COLORS.noticeText,
                      padding: '10px 14px',
                      borderRadius: 12,
                      marginBottom: 12,
                      fontSize: 13,
                      fontWeight: 600,

                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <span>📢 {latestNotice.content}</span>

                    <div style={{ display: 'flex', gap: 6 }}>
                      {/* 🔥 작성자만 삭제 가능 */}
                      {latestNotice.senderId === currentUser?.id && (
                        <button
                          onClick={() => {
                            if (isChatBanned) {
                              setBlockMessage(
                                '채팅 이용이 제한되어 공지를 삭제할 수 없습니다.',
                              )
                              return
                            }
                            handleDeleteNotice(latestNotice.id)
                          }}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#ef4444',
                            fontSize: 12,
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          삭제
                        </button>
                      )}

                      <button
                        onClick={() => setHideNotice(true)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontSize: 12,
                          color: COLORS.noticeText,
                        }}
                      >
                        접기
                      </button>
                    </div>
                  </div>
                )}

                {!currentRoom && (
                  <div
                    style={{
                      textAlign: 'center',
                      color: darkMode ? '#64748b' : '#9ca3af',
                      fontSize: 14,
                    }}
                  >
                    왼쪽에서 채팅방을 선택하거나 새 채팅을 시작하세요.
                  </div>
                )}

                {currentRoom &&
                  roomMessages.map((msg) => {
                    const isMe = msg.senderId === (currentUser?.id || 0)
                    if (msg.type === 'notice') {
                      const isOwner = msg.senderId === currentUser?.id

                      return (
                        <div
                          key={msg.id}
                          style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            margin: '14px 0',
                          }}
                        >
                          <div
                            style={{
                              background: COLORS.noticeBg,
                              color: COLORS.noticeText,
                              padding: '8px 14px',
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            📢 {msg.content}
                            {isOwner && (
                              <button
                                onClick={() => {
                                  if (isChatBanned) {
                                    setBlockMessage(
                                      '채팅 이용이 제한되어 공지를 삭제할 수 없습니다.',
                                    )
                                    return
                                  }
                                  handleDeleteNotice(msg.id)
                                }}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  fontSize: 11,
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                }}
                              >
                                삭제
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    }

                    if (msg.type === 'poll') {
                      const isMe = msg.senderId === (currentUser?.id || 0)

                      return (
                        <div
                          key={msg.id}
                          style={{
                            display: 'flex',
                            justifyContent: isMe ? 'flex-end' : 'flex-start',
                            marginBottom: 12,
                          }}
                        >
                          <div
                            style={{
                              width: '100%',
                              maxWidth: 560, // 🔥 핵심: 투표 최대 폭
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: isMe ? 'flex-end' : 'flex-start',
                            }}
                          >
                            {/* 이름 */}
                            <span
                              style={{
                                fontSize: 11,
                                color: COLORS.subText,
                                marginBottom: 2,
                                paddingRight: 4,
                              }}
                            >
                              {isMe ? '나' : msg.senderName}
                            </span>

                            <PollMessage
                              msg={msg}
                              currentUser={currentUser}
                              onRefresh={async () => {
                                const res = await apiFetch(
                                  `/api/chat/messages/${currentRoomId}`,
                                )
                                const data = await safeJson<ChatMessage[]>(res)
                                setMessages(Array.isArray(data) ? data : [])
                              }}
                            />
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={msg.id}
                        onClick={() => {
                          if (!reportMode) return
                          if (msg.senderId === currentUser?.id) return

                          setReportTarget(msg)
                          setShowReportModal(true)
                          setReportMode(false)
                        }}
                        style={{
                          display: 'flex',
                          justifyContent: isMe ? 'flex-end' : 'flex-start',
                          marginBottom: 8,
                          cursor: reportMode && !isMe ? 'pointer' : 'default',
                          opacity: reportMode && isMe ? 0.4 : 1,
                        }}
                      >
                        <div
                          style={{
                            maxWidth:
                              msg.type === 'image' ||
                              msg.type === 'file' ||
                              msg.type === 'video'
                                ? 'none'
                                : '75%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start',
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              color: COLORS.subText,
                              marginBottom: 2,
                              paddingRight: 4,
                            }}
                          >
                            {isMe ? '나' : msg.senderName}
                          </span>
                          <div
                            style={{
                              padding:
                                msg.type === 'image' ||
                                msg.type === 'file' ||
                                msg.type === 'url' ||
                                msg.type === 'video'
                                  ? 0
                                  : '10px 14px',

                              borderRadius:
                                msg.type === 'image' ||
                                msg.type === 'file' ||
                                msg.type === 'url' ||
                                msg.type === 'video'
                                  ? 0
                                  : 12,

                              background:
                                msg.type === 'image' ||
                                msg.type === 'file' ||
                                msg.type === 'url' ||
                                msg.type === 'video'
                                  ? 'transparent'
                                  : isMe
                                    ? '#4FC3F7'
                                    : darkMode
                                      ? '#1e293b'
                                      : 'white',
                              color: isMe
                                ? 'white'
                                : darkMode
                                  ? '#e5e7eb'
                                  : '#111827',
                              fontSize: 14,
                              wordBreak: 'break-word',
                              maxWidth:
                                msg.type === 'image' || msg.type === 'file'
                                  ? 'none'
                                  : '75%',
                            }}
                          >
                            {msg.type === 'text' && msg.content}

                            {msg.type === 'url' && (
                              <LinkPreview url={msg.content} isMe={isMe} />
                            )}

                            {msg.type === 'image' && msg.fileUrl && (
                              <img
                                src={msg.fileUrl}
                                alt="uploaded"
                                style={{
                                  maxWidth: 280, // 🔥 200 → 280 (체감 큼)
                                  maxHeight: 360, // 🔥 세로 제한
                                  borderRadius: 14,
                                  display: 'block',
                                  cursor: 'pointer',
                                }}
                                onClick={() => {
                                  setCanDownloadPreview(true) // ✅ 메시지 이미지는 다운로드 가능
                                  setPreviewImage(msg.fileUrl ?? null)
                                }}
                              />
                            )}

                            {msg.type === 'file' && msg.fileUrl && (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  padding: '10px 14px',
                                  borderRadius: 12,
                                  background: isMe
                                    ? '#4FC3F7'
                                    : darkMode
                                      ? '#1e293b'
                                      : '#f3f4f6',

                                  color: isMe ? 'white' : COLORS.text,
                                  cursor: 'pointer',
                                  maxWidth: 320,
                                }}
                                onClick={() => {
                                  const encoded = encodeURIComponent(
                                    msg.fileUrl!,
                                  )
                                  window.open(
                                    `/api/chat/download?url=${encoded}`,
                                  )
                                }}
                              >
                                <span style={{ fontSize: 20 }}>📄</span>
                                <div style={{ overflow: 'hidden' }}>
                                  <div
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 600,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {msg.fileName}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: isMe
                                        ? 'rgba(255,255,255,0.8)'
                                        : darkMode
                                          ? '#cbd5e1'
                                          : COLORS.subText,
                                    }}
                                  >
                                    파일 다운로드
                                  </div>
                                </div>
                              </div>
                            )}

                            {msg.type === 'video' && msg.fileUrl && (
                              <div style={{ maxWidth: 320 }}>
                                <video
                                  controls
                                  style={{
                                    width: '100%',
                                    borderRadius: 14,
                                    display: 'block',
                                  }}
                                >
                                  <source src={msg.fileUrl} />
                                </video>
                              </div>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: 10,
                              color: darkMode ? '#64748b' : '#9ca3af',
                              marginTop: 2,
                              display: 'flex',
                              gap: 6,
                              alignItems: 'center',
                            }}
                          >
                            {reportMode && !isMe && (
                              <span
                                style={{
                                  fontSize: 10,
                                  color: '#ef4444',
                                  fontWeight: 600,
                                }}
                              >
                                클릭하여 신고
                              </span>
                            )}

                            {formatKST(msg.createdAt)}

                            {/* 🔥 모든 메시지에 안 읽은 사람 수 표시 */}
                            {msg.readCount !== undefined &&
                              msg.readCount > 0 && (
                                <span
                                  style={{ color: '#2563eb', fontWeight: 600 }}
                                >
                                  {msg.readCount}
                                </span>
                              )}
                            {isMe && Number.isFinite(Number(msg.id)) && (
                              <button
                                onClick={() => {
                                  if (isChatBanned) {
                                    setBlockMessage(
                                      '채팅 이용이 제한되어 메시지를 삭제할 수 없습니다.',
                                    )
                                    return
                                  }
                                  handleDeleteMessage(msg.id)
                                }}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#ef4444',
                                  fontSize: 10,
                                  cursor: 'pointer',
                                }}
                              >
                                삭제
                              </button>
                            )}
                          </span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* 파일 프리뷰 */}
            {uploadingFiles.length > 0 && (
              <div
                style={{
                  padding: '6px 12px',
                  borderTop: '1px solid #e5e7eb',
                  background: COLORS.softBg,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  {uploadingFiles.map((file, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '3px 6px',
                        background: darkMode ? '#1e293b' : 'white',
                        borderRadius: 999,
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      {file.name}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleClearFiles}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#ef4444',
                    cursor: 'pointer',
                  }}
                >
                  ✖️ 취소
                </button>
              </div>
            )}

            {pendingImages.length > 0 && (
              <div
                style={{
                  padding: '8px 12px',
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  gap: 8,
                  overflowX: 'auto',
                  background: darkMode ? '#0f172a' : '#f9fafb',
                }}
              >
                {pendingImages.map((file, idx) => {
                  const url = URL.createObjectURL(file)
                  return (
                    <div key={idx} style={{ position: 'relative' }}>
                      <img
                        src={url}
                        style={{
                          width: 72,
                          height: 72,
                          objectFit: 'cover',
                          borderRadius: 10,
                        }}
                      />
                      <button
                        onClick={() =>
                          setPendingImages((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        style={{
                          position: 'absolute',
                          top: -6,
                          right: -6,
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          border: 'none',
                          background: '#ef4444',
                          color: 'white',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* 입력 영역 */}
            <div
              style={{
                padding: '8px 12px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: darkMode ? '#1e293b' : 'white',
                position: 'sticky',
                bottom: 0,
              }}
            >
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowAttachMenu((v) => !v)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    border: `1px solid ${COLORS.border}`,
                    background: darkMode ? '#1e293b' : '#f9fafb',
                    color: COLORS.text, // ⭐ 추가
                    fontSize: 18,
                    fontWeight: 700, // ⭐ 추가
                    cursor: 'pointer',
                  }}
                >
                  +
                </button>

                {/* 첨부 메뉴 */}
                {showAttachMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 40,
                      left: 0,
                      background: darkMode ? '#1e293b' : 'white',
                      borderRadius: 12,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      padding: 6,
                      width: 140,
                      zIndex: 100,
                    }}
                  >
                    <AttachItem
                      icon="📷"
                      label="사진"
                      onClick={() => {
                        if (isChatBanned) {
                          setBlockMessage(
                            '채팅 이용이 제한되어 사진을 보낼 수 없습니다.',
                          )
                          return
                        }

                        setShowAttachMenu(false)
                        imageInputRef.current?.click()
                      }}
                    />

                    <AttachItem
                      icon="🎥"
                      label="동영상"
                      onClick={() => {
                        if (isChatBanned) {
                          setBlockMessage(
                            '채팅 이용이 제한되어 동영상을 보낼 수 없습니다.',
                          )
                          return
                        }

                        setShowAttachMenu(false)
                        fileInputRef.current?.click()
                      }}
                    />

                    <AttachItem
                      icon="📄"
                      label="파일"
                      onClick={() => {
                        if (isChatBanned) {
                          setBlockMessage(
                            '채팅 이용이 제한되어 파일을 보낼 수 없습니다.',
                          )
                          return
                        }

                        setShowAttachMenu(false)
                        fileInputRef.current?.click()
                      }}
                    />

                    {/* 🔥 투표 */}
                    <AttachItem
                      icon="📊"
                      label="투표"
                      onClick={() => {
                        if (isChatBanned) {
                          setBlockMessage(
                            '채팅 이용이 제한되어 투표를 만들 수 없습니다.',
                          )
                          return
                        }
                        setShowAttachMenu(false)
                        setShowPollModal(true)
                      }}
                    />
                  </div>
                )}
              </div>

              <input
                type="text"
                placeholder={
                  blockMessage
                    ? '상대방과의 대화가 제한되어 있습니다.'
                    : currentRoom
                      ? '메시지를 입력하세요…'
                      : '채팅방을 먼저 선택하세요.'
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !blockMessage) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                disabled={!currentRoom || isChatBanned}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 999,

                  fontSize: 14,
                  outline: 'none',
                  backgroundColor: blockMessage
                    ? darkMode
                      ? '#334155'
                      : '#f3f4f6'
                    : darkMode
                      ? '#1e293b'
                      : 'white',

                  color: blockMessage
                    ? '#9ca3af'
                    : darkMode
                      ? '#e5e7eb'
                      : '#111827',

                  border: `1px solid ${COLORS.border}`,
                  cursor: blockMessage ? 'not-allowed' : 'text',
                }}
              />

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((v) => !v)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    border: `1px solid ${COLORS.border}`,
                    background: darkMode ? '#0f172a' : '#f9fafb',
                    fontSize: 18,
                    cursor: 'pointer',
                    marginRight: 6,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      transform: 'translateX(-3px) translateY(-1px)', // ⭐ 위로 1px
                    }}
                  >
                    😊
                  </span>
                </button>
                {showEmojiPicker && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 42,
                      right: 0,
                      background: darkMode ? '#1e293b' : 'white',
                      borderRadius: 12,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      padding: 8,
                      zIndex: 100,
                      width: 240,
                    }}
                  >
                    {/* 🔹 상단 헤더 */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        이모지
                      </span>
                      <button
                        onClick={() => setShowEmojiPicker(false)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          fontSize: 14,
                          cursor: 'pointer',
                        }}
                      >
                        ❌
                      </button>
                    </div>
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setInputText((prev) => prev + emoji)
                        }}
                        style={{
                          fontSize: 16,
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={
                  !currentRoom ||
                  (!inputText.trim() && pendingImages.length === 0)
                }
                style={{
                  width: 70,
                  height: 32,
                  borderRadius: 999,
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,

                  cursor:
                    currentRoom &&
                    (inputText.trim() || pendingImages.length > 0)
                      ? 'pointer'
                      : 'default',

                  background:
                    currentRoom &&
                    (inputText.trim() || pendingImages.length > 0)
                      ? '#4FC3F7'
                      : '#e5e7eb',

                  color:
                    currentRoom &&
                    (inputText.trim() || pendingImages.length > 0)
                      ? 'white'
                      : '#9ca3af',
                }}
              >
                전송
              </button>
            </div>
          </section>
        )}
      </div>

      {/* 초대 모달 */}
      {showInviteModal && (
        <InviteModal
          mode={inviteMode}
          roomId={currentRoomId}
          onClose={() => setShowInviteModal(false)}
          onCreate={handleCreateRoom}
          schoolCode={currentUser?.schoolCode}
          token={currentUser?.token}
          currentUserId={currentUser?.id}
          friends={friends}
          onAddFriend={handleAddFriend}
          onToggleBlock={handleToggleBlock} // ✅ 이 줄 추가
        />
      )}

      {showPollModal && currentRoomId && (
        <PollCreateModal
          roomId={currentRoomId}
          onClose={() => setShowPollModal(false)}
          onCreated={async () => {
            const res = await apiFetch(`/api/chat/messages/${currentRoomId}`)
            const data = await safeJson<ChatMessage[]>(res)
            setMessages(Array.isArray(data) ? data : [])
          }}
          onBlocked={(msg) => {
            setShowPollModal(false)
            setBlockMessage(msg)
          }}
        />
      )}

      {/* ================= 참여자 목록 모달 ================= */}
      {showRoomUsers && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowRoomUsers(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: 360,
              background: darkMode ? '#1e293b' : 'white',
              borderRadius: 16,
              padding: 16,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
              👥 참여자 목록 ({roomUsers.length})
            </h3>

            {roomUsers.map((u) => (
              <div
                key={u.id}
                style={{
                  padding: '10px 6px',
                  borderBottom: `1px solid ${COLORS.border}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  {/* 🔥 프로필 이미지 */}
                  <img
                    src={u.profileImageUrl || '/default-profile.svg'}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!u.profileImageUrl) return
                      setCanDownloadPreview(false)
                      setTimeout(() => {
                        setPreviewImage(u.profileImageUrl!)
                      }, 0)
                    }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: darkMode
                        ? '1px solid #334155'
                        : '1px solid #e5e7eb',
                      cursor: 'pointer',
                    }}
                  />

                  {/* 텍스트 영역 */}
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span>{u.name}</span>

                      {/* ✅ 나 표시 */}
                      {u.id === currentUser?.id && (
                        <span
                          style={{
                            fontSize: 11,
                            padding: '2px 6px',
                            borderRadius: 999,
                            background: '#dbeafe',
                            color: '#1d4ed8',
                            fontWeight: 700,
                          }}
                        >
                          나
                        </span>
                      )}

                      {/* ✅ 방장 표시 */}
                      {Boolean(u.isOwner) && (
                        <span
                          style={{
                            fontSize: 11,
                            padding: '2px 6px',
                            borderRadius: 999,
                            background: '#fde68a',
                            color: '#92400e',
                            fontWeight: 700,
                          }}
                        >
                          방장
                        </span>
                      )}

                      <span style={{ fontSize: 11, color: COLORS.subText }}>
                        @{u.username}
                      </span>
                    </div>

                    {u.gradeLabel && (
                      <div style={{ fontSize: 12, color: COLORS.subText }}>
                        {u.gradeLabel}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={() => setShowRoomUsers(false)}
              style={{
                marginTop: 12,
                width: '100%',
                padding: '8px 0',
                borderRadius: 999,
                border: 'none',
                background: '#4FC3F7',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* ================= 이미지 미리보기 모달 ================= */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 99999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <img
              src={previewImage}
              alt="preview"
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                borderRadius: 12,
              }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              {/* 다운로드 */}
              {canDownloadPreview && (
                <button
                  type="button"
                  onClick={() => {
                    const encoded = encodeURIComponent(previewImage!)
                    window.location.href = `/api/chat/download?url=${encoded}`
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 999,
                    background: '#4FC3F7',
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  ⬇️ 다운로드
                </button>
              )}

              {/* 닫기 */}
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  border: 'none',
                  background: darkMode ? '#334155' : '#e5e7eb',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 🚫 채팅 차단 안내 모달 ================= */}
      {blockMessage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
          }}
          onClick={() => setBlockMessage(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: 360,
              background: darkMode ? '#1e293b' : 'white',
              borderRadius: 18,
              padding: '22px 20px',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 10 }}>🚫</div>

            <h3
              style={{
                fontSize: 16,
                fontWeight: 800,
                marginBottom: 8,
                color: COLORS.text,
              }}
            >
              메시지를 보낼 수 없습니다
            </h3>

            <p
              style={{
                fontSize: 14,
                color: COLORS.subText,
                lineHeight: 1.5,
                marginBottom: 18,
                whiteSpace: 'pre-line',
              }}
            >
              {blockMessage}
            </p>

            <button
              onClick={() => setBlockMessage(null)}
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
              확인
            </button>
          </div>
        </div>
      )}

      {showReportModal && reportTarget && (
        <ReportModal
          message={reportTarget}
          roomId={currentRoomId!}
          onClose={() => {
            setShowReportModal(false)
            setReportTarget(null)
          }}
        />
      )}

      {/* ================= 👥 친구 목록 모달 ================= */}
      {showFriendsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowFriendsModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: 420,
              background: darkMode ? '#1e293b' : 'white',
              borderRadius: 16,
              padding: 16,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              👥 친구 목록
            </h3>

            {friendsModalMode === 'chat' && (
              <button
                onClick={() => {
                  setShowFriendsModal(false)
                  setInviteMode('oneToOne')
                  setShowInviteModal(true)
                }}
                style={{
                  fontSize: 12,
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: 'none',
                  background: '#4FC3F7',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                ➕ 친구 추가
              </button>
            )}

            {friends.length === 0 ? (
              <p
                style={{
                  fontSize: 13,
                  color: COLORS.subText,
                  textAlign: 'center',
                }}
              >
                친구가 없습니다.
              </p>
            ) : (
              friends.map((f) => (
                <div
                  key={f.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 6px',
                    borderBottom: `1px solid ${COLORS.border}`,
                  }}
                >
                  <img
                    src={f.profileImageUrl || '/default-profile.svg'}
                    onClick={(e) => {
                      e.stopPropagation()

                      if (!f.profileImageUrl) return

                      setCanDownloadPreview(false) // 🔒 프로필 사진은 다운로드 막기
                      setPreviewImage(f.profileImageUrl)
                    }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: darkMode
                        ? '1px solid #334155'
                        : '1px solid #e5e7eb',
                      cursor: 'pointer', // ✅ 클릭 가능 표시
                    }}
                  />

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{f.name}</div>
                    <div style={{ fontSize: 12, color: COLORS.subText }}>
                      @{f.username} · {f.gradeLabel}
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      setShowFriendsModal(false)

                      if (friendsModalMode === 'invite' && currentRoomId) {
                        // 🔥 현재 채팅방에 초대
                        const res = await apiFetch(
                          `/api/chat/messages/${currentRoomId}/invite`,
                          {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userIds: [f.id] }),
                          },
                        )

                        if (!res.ok) {
                          setAlert({
                            open: true,
                            title: '초대 실패',
                            message:
                              '채팅방 초대에 실패했습니다.\n잠시 후 다시 시도해주세요.',
                          })
                          return
                        }
                      } else {
                        // 기존 동작: 1:1 채팅
                        handleCreateRoom('oneToOne', [f.id])
                      }

                      // 모드 초기화 (중요)
                      setFriendsModalMode('chat')
                    }}
                    style={{
                      fontSize: 12,
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: 'none',
                      background: '#4FC3F7',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    {friendsModalMode === 'invite' ? '➕ 초대' : '💬 채팅'}
                  </button>

                  <button
                    onClick={() => handleDeleteFriend(f.id)}
                    style={{
                      fontSize: 12,
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: 'none',
                      background: COLORS.softBg,
                      cursor: 'pointer',
                    }}
                  >
                    🗑
                  </button>

                  <button
                    onClick={() => handleToggleBlock(f.id)}
                    style={{
                      fontSize: 12,
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: 'none',
                      background: '#fee2e2',
                      color: '#b91c1c',
                      cursor: 'pointer',
                    }}
                  >
                    🚫
                  </button>
                </div>
              ))
            )}

            <button
              onClick={() => setShowFriendsModal(false)}
              style={{
                marginTop: 12,
                width: '100%',
                padding: '8px 0',
                borderRadius: 999,
                border: 'none',
                background: '#4FC3F7',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {renameModal.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: 16,
          }}
          onClick={() =>
            setRenameModal({
              open: false,
              roomId: null,
              name: '',
            })
          }
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 380,
              background: darkMode ? '#1e293b' : 'white',
              color: COLORS.text,
              borderRadius: 18,
              padding: 20,
              boxShadow: '0 20px 45px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>✏️</div>

            <h3
              style={{
                fontSize: 18,
                fontWeight: 800,
                marginBottom: 6,
              }}
            >
              채팅방 이름 변경
            </h3>

            <p
              style={{
                fontSize: 13,
                color: COLORS.subText,
                marginBottom: 14,
                lineHeight: 1.5,
              }}
            >
              새 채팅방 이름을 입력하세요.
            </p>

            <input
              autoFocus
              value={renameModal.name}
              onChange={(e) =>
                setRenameModal((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  submitRenameRoom()
                }

                if (e.key === 'Escape') {
                  setRenameModal({
                    open: false,
                    roomId: null,
                    name: '',
                  })
                }
              }}
              placeholder="예: 2학년 3반 모임"
              maxLength={30}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 14px',
                borderRadius: 12,
                border: `1px solid ${COLORS.border}`,
                background: darkMode ? '#0f172a' : '#f9fafb',
                color: COLORS.text,
                fontSize: 14,
                outline: 'none',
              }}
            />

            <div
              style={{
                textAlign: 'right',
                fontSize: 11,
                color: COLORS.subText,
                marginTop: 6,
              }}
            >
              {renameModal.name.length}/30
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                marginTop: 18,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setRenameModal({
                    open: false,
                    roomId: null,
                    name: '',
                  })
                }
                style={{
                  padding: '9px 14px',
                  borderRadius: 999,
                  border: `1px solid ${COLORS.border}`,
                  background: darkMode ? '#0f172a' : 'white',
                  color: COLORS.text,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                취소
              </button>

              <button
                type="button"
                onClick={submitRenameRoom}
                disabled={!renameModal.name.trim()}
                style={{
                  padding: '9px 16px',
                  borderRadius: 999,
                  border: 'none',
                  background: renameModal.name.trim() ? '#4FC3F7' : '#e5e7eb',
                  color: renameModal.name.trim() ? 'white' : '#9ca3af',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: renameModal.name.trim() ? 'pointer' : 'default',
                }}
              >
                변경하기
              </button>
            </div>
          </div>
        </div>
      )}
      <AlertModal
        open={alert.open}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert({ open: false, message: '' })}
      />

      <ConfirmModal
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        danger={confirm.danger}
        onClose={() => setConfirm({ open: false, message: '' })}
        onConfirm={() => {
          confirm.onConfirm?.()
          setConfirm({ open: false, message: '' })
        }}
      />
    </main>
  )
}

/* =========================
   초대 모달 컴포넌트
   - 이름 검색
   - 학년 + 반(예: 1학년 3반)
========================= */

function InviteModal({
  mode,
  roomId,
  onClose,
  onCreate,
  schoolCode,
  token,
  currentUserId,
  friends,
  onAddFriend,
  onToggleBlock, // ✅ 추가
}: {
  mode: 'oneToOne' | 'group'
  roomId: number | null
  onClose: () => void
  onCreate: (mode: 'oneToOne' | 'group', userIds: number[]) => Promise<void>
  schoolCode?: string
  token?: string
  currentUserId?: number
  friends: Friend[]
  onAddFriend: (friendId: number) => Promise<void>
  onToggleBlock: (targetId: number) => Promise<void> // ✅ 추가
}) {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedUser = localStorage.getItem('loggedInUser')
    if (!storedUser) return

    try {
      const parsed = JSON.parse(storedUser)
      const userId = parsed.id
      if (!userId) return

      const raw = localStorage.getItem(`theme_settings_${userId}`)
      if (!raw) return

      const settings = JSON.parse(raw)
      setDarkMode(Boolean(settings.darkMode))
    } catch {
      setDarkMode(false)
    }
  }, [])

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.darkMode !== undefined) {
        setDarkMode(e.detail.darkMode)
      }
    }

    window.addEventListener('theme-change', handler)
    return () => window.removeEventListener('theme-change', handler)
  }, [])

  const COLORS = {
    bg: darkMode ? '#1e293b' : 'white',
    border: darkMode ? '#334155' : '#e5e7eb',
    text: darkMode ? '#e5e7eb' : '#111827',
    subText: darkMode ? '#94a3b8' : '#6b7280',
    softBg: darkMode ? '#334155' : '#f3f4f6',
  }
  const [tab, setTab] = useState<'friends' | 'name' | 'class'>('friends')
  const [nameKeyword, setNameKeyword] = useState('')
  const [grade, setGrade] = useState<'1' | '2' | '3'>('1')
  const [classNum, setClassNum] = useState('')
  const [results, setResults] = useState<UserSummary[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])
  const [selectedUsers, setSelectedUsers] = useState<UserSummary[]>([])

  const friendIdSet = new Set(friends.map((f) => f.id))

  const isFriend = (userId: number) => friendIdSet.has(userId)

  const isInvite = Boolean(roomId)

  const toggleSelect = (user: UserSummary) => {
    setSelectedUserIds((prev) =>
      prev.includes(user.id)
        ? prev.filter((id) => id !== user.id)
        : [...prev, user.id],
    )

    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user],
    )
  }

  const handleSearchByName = async () => {
    if (!nameKeyword.trim()) return
    if (!schoolCode) return

    const res = await apiFetch(
      `/api/chat/search/users?name=${encodeURIComponent(nameKeyword)}&schoolCode=${schoolCode}`,
    )

    // ❗ 응답 실패 or body 없음 방어
    if (!res.ok) {
      setResults([])
      return
    }

    const text = await res.text() // 🔥 핵심
    if (!text) {
      setResults([])
      return
    }

    const data = JSON.parse(text)
    setResults(Array.isArray(data) ? data : [])

    console.log(
      `/api/chat/search/users?name=${nameKeyword}&schoolCode=${schoolCode}`,
    )
  }

  const handleSearchByClass = async () => {
    if (!classNum.trim()) return
    if (!schoolCode) return

    const res = await apiFetch(
      `/api/chat/search/users?grade=${grade}&classNum=${classNum}&schoolCode=${schoolCode}`,
    )

    if (!res.ok) {
      setResults([])
      return
    }

    const text = await res.text()
    if (!text) {
      setResults([])
      return
    }

    const data = JSON.parse(text)
    setResults(Array.isArray(data) ? data : [])
  }

  const handleCreateChat = async () => {
    if (mode === 'oneToOne' && selectedUserIds.length !== 1) {
      alert('1:1 채팅은 한 명만 선택해야 합니다.')
      return
    }

    if (mode === 'group' && selectedUserIds.length < 2) {
      alert('그룹 채팅은 최소 3명부터 가능합니다.')
      return
    }

    // ❌ 그 외 경우만 새 채팅 생성
    await onCreate(mode, selectedUserIds)

    // 🔥 방 목록 강제 새로고침 (이게 핵심)
    if (token) {
      const res = await apiFetch('/api/chat/rooms', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      // ❗ ChatPage의 setRooms를 직접 못 쓰므로
      // ❗ 새로 만든 방으로 이동만 확실히 처리
    }

    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: '95%',
          maxWidth: 520,
          background: COLORS.bg,
          color: COLORS.text,
          borderRadius: 16,
          padding: 18,
          boxShadow: '0 10px 30px rgba(15,23,42,0.35)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 10,
            alignItems: 'center',
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            {mode === 'oneToOne' ? '1:1 채팅 시작' : '그룹 채팅 만들기'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            ✖
          </button>
        </div>

        {/* 탭 */}
        <div
          style={{
            display: 'flex',
            marginBottom: 10,
            background: COLORS.softBg,
            borderRadius: 999,
            padding: 2,
          }}
        >
          <button
            onClick={() => setTab('friends')}
            style={{
              flex: 1,
              border: 'none',
              borderRadius: 999,
              padding: '6px 0',
              fontWeight: 600,
              background: tab === 'friends' ? 'white' : 'transparent',
            }}
          >
            친구
          </button>
          <button
            type="button"
            onClick={() => setTab('name')}
            style={{
              flex: 1,
              border: 'none',
              borderRadius: 999,
              padding: '6px 0',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              background:
                tab === 'name'
                  ? darkMode
                    ? '#0f172a'
                    : 'white'
                  : 'transparent',

              color: tab === 'name' ? COLORS.text : COLORS.subText,
            }}
          >
            이름 검색
          </button>
          <button
            type="button"
            onClick={() => setTab('class')}
            style={{
              flex: 1,
              border: 'none',
              borderRadius: 999,
              padding: '6px 0',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              background: tab === 'class' ? 'white' : 'transparent',
              color: tab === 'class' ? '#111827' : '#6b7280',
            }}
          >
            학년 / 반 검색
          </button>
        </div>

        {/* 탭 내용 */}
        {tab === 'friends' && (
          <div
            style={{
              maxHeight: 220,
              overflowY: 'auto',
              borderRadius: 10,
              border: `1px solid ${COLORS.border}`,
              padding: 6,
              background: darkMode ? '#0f172a' : '#f9fafb',
              marginBottom: 10,
            }}
          >
            {friends.length === 0 ? (
              <p
                style={{
                  fontSize: 12,
                  color: '#9ca3af',
                  textAlign: 'center',
                  padding: '20px 0',
                }}
              >
                친구가 없습니다.
              </p>
            ) : (
              friends.map((friend) => {
                const checked = selectedUserIds.includes(friend.id)

                return (
                  <label
                    key={friend.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '6px 8px',
                      borderRadius: 8,
                      background: COLORS.bg,
                      color: COLORS.text,
                      marginBottom: 4,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        toggleSelect({
                          id: friend.id,
                          name: friend.name,
                          username: friend.username,
                          profileImageUrl: friend.profileImageUrl,
                          gradeLabel: friend.gradeLabel,
                        })
                      }
                    />

                    <img
                      src={friend.profileImageUrl || '/default-profile.svg'}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1px solid #e5e7eb',
                      }}
                    />

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {friend.name}
                        <span
                          style={{
                            fontSize: 11,
                            color: COLORS.subText,
                            marginLeft: 4,
                          }}
                        >
                          @{friend.username}
                        </span>
                      </div>

                      {friend.gradeLabel && (
                        <div style={{ fontSize: 11, color: COLORS.subText }}>
                          {friend.gradeLabel}
                        </div>
                      )}
                    </div>
                  </label>
                )
              })
            )}
          </div>
        )}
        {tab === 'name' && (
          <div style={{ marginBottom: 10 }}>
            <label
              style={{
                fontSize: 14,
                fontWeight: 600,
                display: 'block',
                marginBottom: 4,
              }}
            >
              친구 이름
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                placeholder="예: 홍길동"
                value={nameKeyword}
                onChange={(e) => setNameKeyword(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: `1px solid ${COLORS.border}`,
                  background: COLORS.bg,
                  color: COLORS.text,
                  fontSize: 14,
                }}
              />
              <button
                type="button"
                onClick={handleSearchByName}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#4FC3F7',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                검색
              </button>
            </div>
            <p style={{ fontSize: 11, color: COLORS.subText, marginTop: 4 }}>
              같은 학교 학생만 검색됩니다.
            </p>
          </div>
        )}

        {tab === 'class' && (
          <div style={{ marginBottom: 10 }}>
            <label
              style={{
                fontSize: 14,
                fontWeight: 600,
                display: 'block',
                marginBottom: 6,
              }}
            >
              학년 / 반
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value as '1' | '2' | '3')}
                style={{
                  width: 90,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: `1px solid ${COLORS.border}`,
                  background: COLORS.bg,
                  color: COLORS.text,
                  fontSize: 14,
                }}
              >
                <option value="1">1학년</option>
                <option value="2">2학년</option>
                <option value="3">3학년</option>
              </select>

              <input
                type="text"
                placeholder="반 (예: 3)"
                value={classNum}
                onChange={(e) =>
                  setClassNum(e.target.value.replace(/[^0-9]/g, ''))
                }
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: `1px solid ${COLORS.border}`,
                  background: COLORS.bg,
                  color: COLORS.text,
                  fontSize: 14,
                }}
              />

              <button
                type="button"
                onClick={handleSearchByClass}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#6366f1',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                검색
              </button>
            </div>
            <p style={{ fontSize: 11, color: COLORS.subText, marginTop: 4 }}>
              예: 1학년 3반 학생들만 불러오고 싶으면 학년=1, 반=3 으로 검색.
            </p>
          </div>
        )}

        {/* 검색 결과 리스트 */}
        {tab !== 'friends' && (
          <div
            style={{
              maxHeight: 220,
              overflowY: 'auto',
              borderRadius: 10,
              border: `1px solid ${COLORS.border}`,
              padding: 6,
              background: darkMode ? '#0f172a' : '#f9fafb',
              marginBottom: 10,
            }}
          >
            {/* ✅ 선택된 사용자 미리보기 */}
            {selectedUserIds.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  marginBottom: 10,
                }}
              >
                {selectedUsers.map((u) => (
                  <span
                    key={u.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      background: '#e0f2fe',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#0369a1',
                    }}
                  >
                    {u.name}
                    <button
                      type="button"
                      onClick={() => toggleSelect(u)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontWeight: 700,
                        color: '#0369a1',
                      }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            {results.length === 0 ? (
              <p
                style={{
                  fontSize: 12,
                  color: '#9ca3af',
                  textAlign: 'center',
                  padding: '20px 0',
                }}
              >
                검색 결과가 없습니다.
              </p>
            ) : (
              results.map((user) => {
                const checked = selectedUserIds.includes(user.id)
                const isMe = user.id === currentUserId
                const alreadyFriend = isFriend(user.id)
                const isBlocked = Boolean((user as any).isBlocked)

                return (
                  <label
                    key={user.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '6px 8px',
                      borderRadius: 8,
                      background: COLORS.bg,
                      color: COLORS.text,
                      marginBottom: 4,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelect(user)}
                    />

                    <img
                      src={user.profileImageUrl || '/default-profile.svg'}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1px solid #e5e7eb',
                      }}
                    />

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {user.name}
                        <span
                          style={{
                            fontSize: 11,
                            color: COLORS.subText,
                            marginLeft: 4,
                          }}
                        >
                          @{user.username}
                        </span>
                      </div>

                      {user.gradeLabel && (
                        <div style={{ fontSize: 11, color: COLORS.subText }}>
                          {user.gradeLabel}
                        </div>
                      )}
                    </div>

                    {/* 🔥 여기 추가 */}
                    {/* 🚫 차단된 사용자 */}
                    {!isMe && isBlocked && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation()
                          await onToggleBlock(user.id)
                          await handleSearchByName()
                        }}
                        style={{
                          fontSize: 12,
                          padding: '6px 8px',
                          borderRadius: 999,
                          border: 'none',
                          background: '#fee2e2',
                          color: '#b91c1c',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        🚫 차단 해제
                      </button>
                    )}

                    {/* ➕ 친구 추가 */}
                    {!isMe && !alreadyFriend && !isBlocked && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation()
                          await onAddFriend(user.id)
                          await handleSearchByName()
                        }}
                        style={{
                          fontSize: 12,
                          padding: '6px 8px',
                          borderRadius: 999,
                          border: 'none',
                          background: '#4FC3F7',
                          color: 'white',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        ➕ 친구
                      </button>
                    )}

                    {/* 이미 친구 */}
                    {!isMe && alreadyFriend && !isBlocked && (
                      <span
                        style={{
                          fontSize: 11,
                          padding: '4px 8px',
                          borderRadius: 999,
                          background: '#e5e7eb',
                          color: COLORS.text,
                          fontWeight: 600,
                        }}
                      >
                        친구
                      </span>
                    )}
                  </label>
                )
              })
            )}
          </div>
        )}

        {/* 하단 버튼 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.bg,
              color: COLORS.text,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              if ((window as any).isChatBanned) {
                alert('채팅 이용이 제한되어 채팅을 시작할 수 없습니다.')
                return
              }
              handleCreateChat()
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              border: 'none',
              background: '#4FC3F7',
              color: 'white',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            채팅 시작
          </button>
        </div>
      </div>
    </div>
  )
}

function AttachItem({
  icon,
  label,
  onClick,
}: {
  icon: string
  label: string
  onClick: () => void
}) {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedUser = localStorage.getItem('loggedInUser')
    if (!storedUser) return

    try {
      const parsed = JSON.parse(storedUser)
      const userId = parsed.id
      if (!userId) return

      const raw = localStorage.getItem(`theme_settings_${userId}`)
      if (!raw) return

      const settings = JSON.parse(raw)
      setDarkMode(Boolean(settings.darkMode))
    } catch {
      setDarkMode(false)
    }
  }, [])

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.darkMode !== undefined) {
        setDarkMode(e.detail.darkMode)
      }
    }

    window.addEventListener('theme-change', handler)
    return () => window.removeEventListener('theme-change', handler)
  }, [])

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        padding: '8px 10px',
        border: 'none',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 14,
        color: darkMode ? '#e5e7eb' : '#111827', // ⭐ 핵심
        fontWeight: 600, // ⭐ 추가
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = darkMode ? '#334155' : '#f3f4f6')
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function MenuItem({
  label,
  onClick,
  danger,
}: {
  label: string
  onClick: () => void
  danger?: boolean
}) {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedUser = localStorage.getItem('loggedInUser')
    if (!storedUser) return

    try {
      const parsed = JSON.parse(storedUser)
      const userId = parsed.id
      if (!userId) return

      const raw = localStorage.getItem(`theme_settings_${userId}`)
      if (!raw) return

      const settings = JSON.parse(raw)
      setDarkMode(Boolean(settings.darkMode))
    } catch {
      setDarkMode(false)
    }
  }, [])

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.darkMode !== undefined) {
        setDarkMode(e.detail.darkMode)
      }
    }

    window.addEventListener('theme-change', handler)
    return () => window.removeEventListener('theme-change', handler)
  }, [])

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        padding: '8px 12px',
        border: 'none',
        background: 'transparent',
        textAlign: 'left',
        cursor: 'pointer',
        fontSize: 13,

        // 🔥 여기 핵심 수정
        color: danger ? '#ef4444' : darkMode ? '#e5e7eb' : '#111827',
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = darkMode ? '#334155' : '#f3f4f6')
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {label}
    </button>
  )
}

function PollCreateModal({
  roomId,
  onClose,
  onCreated,
  onBlocked, // ✅ 추가
}: {
  roomId: number
  onClose: () => void
  onCreated: () => Promise<void>
  onBlocked: (message: string) => void // ✅ 추가
}) {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedUser = localStorage.getItem('loggedInUser')
    if (!storedUser) return

    try {
      const parsed = JSON.parse(storedUser)
      const userId = parsed.id
      if (!userId) return

      const raw = localStorage.getItem(`theme_settings_${userId}`)
      if (!raw) return

      const settings = JSON.parse(raw)
      setDarkMode(Boolean(settings.darkMode))
    } catch {
      setDarkMode(false)
    }
  }, [])

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.darkMode !== undefined) {
        setDarkMode(e.detail.darkMode)
      }
    }

    window.addEventListener('theme-change', handler)
    return () => window.removeEventListener('theme-change', handler)
  }, [])

  const COLORS = {
    bg: darkMode ? '#1e293b' : 'white',
    border: darkMode ? '#334155' : '#e5e7eb',
    text: darkMode ? '#e5e7eb' : '#111827',
    subText: darkMode ? '#94a3b8' : '#6b7280',
    softBg: darkMode ? '#334155' : '#f3f4f6',
  }

  const cancelBtnStyle: React.CSSProperties = {
    padding: '8px 14px',
    borderRadius: 999,
    border: `1px solid ${COLORS.border}`,
    background: darkMode ? '#0f172a' : '#f9fafb',
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  }
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [anonymous, setAnonymous] = useState(false)
  const [closedAt, setClosedAt] = useState<string>('') // ⏰ 마감 시간

  const [showDeadlineModal, setShowDeadlineModal] = useState(false)

  const [deadlineDate, setDeadlineDate] = useState('') // YYYY-MM-DD
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('PM')
  const [hour, setHour] = useState('12')
  const [minute, setMinute] = useState('00')

  const addOption = () => setOptions((o) => [...o, ''])
  const removeOption = (i: number) =>
    setOptions((o) => o.filter((_, idx) => idx !== i))

  const handleSubmit = async () => {
    if (!title.trim()) return alert('투표 제목을 입력하세요')
    if (options.filter((o) => o.trim()).length < 2)
      return alert('선택지는 최소 2개입니다')

    let finalClosedAt: string | null = null

    if (deadlineDate) {
      let h = parseInt(hour, 10)

      if (ampm === 'PM' && h !== 12) h += 12
      if (ampm === 'AM' && h === 12) h = 0

      finalClosedAt = new Date(
        `${deadlineDate}T${String(h).padStart(2, '0')}:${minute}:00`,
      ).toISOString()
    }

    const res = await apiFetch('/api/chat/poll/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        title,
        options: options.filter((o) => o.trim()),
        anonymous,
        closedAt: finalClosedAt,
      }),
    })

    /* 🔥 전학 / 학교 다름 차단 */
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))

      if (res.status === 403) {
        if (err?.message === 'CHAT_BANNED') {
          onBlocked(
            `채팅 이용이 제한되었습니다.\n정지 해제 시간: ${formatKST(err.banEnd)}`,
          )
          return
        }

        onBlocked(err.message || '투표 생성이 제한되었습니다.')
        return
      }

      onBlocked(err.message || '투표 생성에 실패했습니다.')
      return
    }

    /* ✅ 성공한 경우만 */
    await onCreated()
    onClose()
  }

  return (
    <>
      {/* ================= 투표 만들기 모달 ================= */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          zIndex: 9999,
        }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '92%',
            maxWidth: 500,
            background: COLORS.bg,
            color: COLORS.text,
            borderRadius: 16,
            padding: 20,
            maxHeight: 'calc(100vh - 100px)',
            overflowY: 'auto',
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>📊 투표 만들기</h3>

          <input
            placeholder="투표 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '95%',
              marginTop: 10,
              padding: '10px 12px',
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              background: darkMode ? '#0f172a' : 'white',
              color: COLORS.text,
              fontSize: 14,
            }}
          />

          {options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input
                value={opt}
                onChange={(e) =>
                  setOptions((o) =>
                    o.map((v, idx) => (idx === i ? e.target.value : v)),
                  )
                }
                placeholder={`선택지 ${i + 1}`}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: `1px solid ${COLORS.border}`,
                  background: darkMode ? '#0f172a' : 'white',
                  color: COLORS.text,
                  fontSize: 14,
                }}
              />
              {options.length > 2 && (
                <button onClick={() => removeOption(i)}>✕</button>
              )}
            </div>
          ))}

          <button
            onClick={addOption}
            style={{
              marginTop: 10,
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              background: darkMode ? '#0f172a' : '#f9fafb',
              color: COLORS.text,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + 선택지 추가
          </button>

          <label style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <input
              type="checkbox"
              checked={anonymous}
              onChange={() => setAnonymous((v) => !v)}
            />
            익명 투표
          </label>

          <label style={{ display: 'block', marginTop: 12, fontSize: 13 }}>
            ⏰ 투표 마감 시간 (선택)
          </label>

          <button
            type="button"
            onClick={() => setShowDeadlineModal(true)}
            style={{
              width: '100%',
              marginTop: 6,
              padding: '10px 12px',
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              background: darkMode ? '#0f172a' : 'white',
              color: COLORS.text,
              textAlign: 'left',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {deadlineDate
              ? `⏰ ${deadlineDate} ${ampm === 'AM' ? '오전' : '오후'} ${hour}:${minute}`
              : '⏰ 투표 마감 시간 선택'}
          </button>

          <p style={{ fontSize: 11, color: COLORS.subText, marginTop: 4 }}>
            설정하지 않으면 방장이 직접 마감해야 합니다.
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              marginTop: 14,
            }}
          >
            <button onClick={onClose} style={cancelBtnStyle}>
              취소
            </button>
            <button
              onClick={handleSubmit}
              style={{
                background: '#4FC3F7',
                color: 'white',
                padding: '8px 14px',
                borderRadius: 999,
                border: 'none',
                fontWeight: 600,
              }}
            >
              생성
            </button>
          </div>
        </div>
      </div>
      )
      {showDeadlineModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => setShowDeadlineModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: 360,
              background: COLORS.bg,
              color: COLORS.text,
              borderRadius: 16,
              padding: 16,
            }}
          >
            <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
              ⏰ 투표 마감 시간
            </h4>

            {/* 날짜 */}
            <label style={{ fontSize: 13, fontWeight: 600 }}>날짜</label>
            <input
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              style={{
                width: '93%',
                marginTop: 4,
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${COLORS.border}`,
                background: darkMode ? '#0f172a' : 'white',
                color: COLORS.text,
              }}
            />

            {/* 시간 */}
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <select
                value={ampm}
                onChange={(e) => setAmpm(e.target.value as any)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: `1px solid ${COLORS.border}`,
                  background: darkMode ? '#0f172a' : 'white',
                  color: COLORS.text,
                  fontSize: 14,
                }}
              >
                <option value="AM">오전</option>
                <option value="PM">오후</option>
              </select>

              <select
                value={hour}
                onChange={(e) => setHour(e.target.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: `1px solid ${COLORS.border}`,
                  background: darkMode ? '#0f172a' : 'white',
                  color: COLORS.text,
                  fontSize: 14,
                }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={String(h).padStart(2, '0')}>
                    {h}
                  </option>
                ))}
              </select>

              <select
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: `1px solid ${COLORS.border}`,
                  background: darkMode ? '#0f172a' : 'white',
                  color: COLORS.text,
                  fontSize: 14,
                }}
              >
                {['00', '10', '20', '30', '40', '50'].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                marginTop: 14,
              }}
            >
              <button
                onClick={() => setShowDeadlineModal(false)}
                style={cancelBtnStyle}
              >
                취소
              </button>
              <button
                onClick={() => setShowDeadlineModal(false)}
                style={{
                  background: '#4FC3F7',
                  color: 'white',
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: 'none',
                  fontWeight: 600,
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ReportModal({
  message,
  roomId,
  onClose,
}: {
  message: ChatMessage
  roomId: number
  onClose: () => void
}) {
  const REASONS = [
    '욕설 / 비방',
    '성희롱 / 음란물',
    '괴롭힘 / 따돌림',
    '스팸 / 광고',
    '기타',
  ]

  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedUser = localStorage.getItem('loggedInUser')
    if (!storedUser) return

    try {
      const parsed = JSON.parse(storedUser)
      const userId = parsed.id
      if (!userId) return

      const raw = localStorage.getItem(`theme_settings_${userId}`)
      if (!raw) return

      const settings = JSON.parse(raw)
      setDarkMode(Boolean(settings.darkMode))
    } catch {
      setDarkMode(false)
    }
  }, [])

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.darkMode !== undefined) {
        setDarkMode(e.detail.darkMode)
      }
    }

    window.addEventListener('theme-change', handler)
    return () => window.removeEventListener('theme-change', handler)
  }, [])

  const COLORS = {
    bg: darkMode ? '#1e293b' : 'white',
    border: darkMode ? '#334155' : '#e5e7eb',
    text: darkMode ? '#e5e7eb' : '#111827',
    subText: darkMode ? '#94a3b8' : '#6b7280',
    softBg: darkMode ? '#334155' : '#f3f4f6',
  }

  const [selectedReason, setSelectedReason] = useState<string>('')
  const [customReason, setCustomReason] = useState('')

  const submitReport = async () => {
    if (!selectedReason) {
      alert('신고 사유를 선택하세요')
      return
    }

    if (selectedReason === '기타' && !customReason.trim()) {
      alert('기타 사유를 입력하세요')
      return
    }

    const finalReason =
      selectedReason === '기타' ? customReason.trim() : selectedReason

    const res = await apiFetch('/api/chat/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        messageId: message.id,
        reportedUserId: message.senderId,
        reason: finalReason,
      }),
    })

    const data = await res.json().catch(() => ({}))

    // ✅ 이미 신고한 경우
    if (res.status === 409) {
      alert(data.message || '이미 신고한 메시지입니다.')
      return
    }

    // ❌ 기타 실패
    if (!res.ok) {
      alert(data.message || '신고 접수 실패')
      return
    }

    // ✅ 성공
    alert('신고가 접수되었습니다')
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90%',
          maxWidth: 420,
          background: COLORS.bg,
          color: COLORS.text,
          borderRadius: 16,
          padding: 20,
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>🚨 메시지 신고</h3>

        {/* 🔹 신고 대상 메시지 */}
        <div
          style={{
            marginTop: 10,
            padding: 10,
            background: COLORS.softBg,
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          <strong>{message.senderName}</strong>
          <div style={{ marginTop: 4 }}>{message.content}</div>
        </div>

        {/* 🔹 신고 사유 선택 */}
        <div style={{ marginTop: 14 }}>
          {REASONS.map((r) => (
            <label
              key={r}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                marginBottom: 6,
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="report-reason"
                value={r}
                checked={selectedReason === r}
                onChange={() => setSelectedReason(r)}
              />
              {r}
            </label>
          ))}
        </div>

        {/* 🔹 기타 선택 시 입력 */}
        {selectedReason === '기타' && (
          <textarea
            placeholder="기타 신고 사유를 입력하세요"
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            rows={3}
            style={{
              width: '95%',
              marginTop: 8,
              padding: 10,
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.bg,
              color: COLORS.text,
              fontSize: 14,
            }}
          />
        )}

        {/* 🔹 버튼 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 14,
          }}
        >
          {/* 취소 버튼 */}
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              border: `1px solid ${COLORS.border}`,
              background: darkMode ? '#0f172a' : '#f9fafb',
              color: COLORS.text,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = darkMode
                ? '#334155'
                : '#f3f4f6'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = darkMode
                ? '#0f172a'
                : '#f9fafb'
            }}
          >
            취소
          </button>

          {/* 신고 버튼 */}
          <button
            onClick={submitReport}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 999,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#dc2626'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ef4444'
            }}
          >
            신고하기
          </button>
        </div>
      </div>
    </div>
  )
}
