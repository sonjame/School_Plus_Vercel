'use client'

import React, { useEffect, useState, useRef } from 'react'
import { apiFetch } from '@/src/lib/apiFetch'

/* =========================
   타입 정의
========================= */

type ChatRoom = {
  id: number
  name: string
  isGroup: boolean
  lastMessage?: string
  unreadCount?: number
}

type ChatMessage = {
  id: number
  roomId: number
  senderId: number
  senderName: string
  content: string
  createdAt: string
  type: 'text' | 'image' | 'file' | 'url'
  fileUrl?: string
  fileName?: string
  readCount?: number
}

type UserSummary = {
  id: number
  name: string
  username: string
  gradeLabel?: string // 예: "1학년 3반"
  isOwner?: boolean | number
}

/* =========================
   메인 페이지 컴포넌트
========================= */

export default function ChatPage() {
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

  const fetchRoomUsers = async () => {
    if (!currentRoomId || !currentUser?.token) return

    const res = await fetch(`/api/chat/messages/${currentRoomId}/users`, {
      headers: {
        Authorization: `Bearer ${currentUser.token}`,
      },
    })

    if (!res.ok) {
      alert('참여자 정보를 불러오지 못했습니다.')
      return
    }

    const data = await res.json()
    setRoomUsers(Array.isArray(data) ? data : [])
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

  const handleCreateRoom = async (
    mode: 'oneToOne' | 'group',
    userIds: number[],
  ) => {
    if (!currentUser?.token) return

    const res = await fetch('/api/chat/create-room', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser.token}`,
      },
      body: JSON.stringify({
        isGroup: mode === 'group',
        name: mode === 'group' ? '새 그룹 채팅' : '1:1 채팅',
        userIds,
      }),
    })

    if (!res.ok) {
      alert('채팅방 생성 실패')
      return
    }

    const data = await res.json()

    setShowInviteModal(false)
    setCurrentRoomId(data.roomId)

    // 채팅방 목록 새로고침 (선택)
    apiFetch('/api/chat/rooms')
      .then((res) => safeJson<ChatRoom[]>(res))
      .then((data) => setRooms(Array.isArray(data) ? data : []))
      .catch(() => setRooms([]))
  }

  // =======================
  // 채팅방 나가기
  // =======================
  const handleLeaveRoom = async () => {
    if (!currentRoomId || !currentUser?.token) return

    if (!confirm('채팅방을 나가시겠습니까?')) return

    const res = await apiFetch(`/api/chat/messages/${currentRoomId}/leave`, {
      method: 'POST',
    })

    if (!res.ok) {
      alert('채팅방 나가기 실패')
      return
    }

    setCurrentRoomId(null)
    setMessages([])

    const listRes = await apiFetch('/api/chat/rooms')
    const data = await safeJson<ChatRoom[]>(listRes)
    setRooms(Array.isArray(data) ? data : [])
  }

  // =======================
  // 채팅방 삭제
  // =======================
  const handleDeleteRoom = async () => {
    if (!currentRoomId || !currentUser?.token) return

    if (!confirm('채팅방을 삭제하면 복구할 수 없습니다.')) return

    const res = await apiFetch(`/api/chat/messages/${currentRoomId}/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId: currentRoomId,
      }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      alert(data.message || '채팅방 삭제에 실패했습니다.')
      return
    }

    setCurrentRoomId(null)
    setMessages([])

    const listRes = await fetch('/api/chat/rooms', {
      headers: {
        Authorization: `Bearer ${currentUser.token}`,
      },
    })
    const listData = await listRes.json()
    setRooms(Array.isArray(listData) ? listData : [])
  }

  const handleRenameRoom = async () => {
    if (!currentRoomId || !currentUser?.token) return

    const newName = prompt('새 채팅방 이름을 입력하세요')
    if (!newName?.trim()) return

    const res = await fetch(`/api/chat/messages/${currentRoomId}/name`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser.token}`,
      },
      body: JSON.stringify({ name: newName }),
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.message || '이름 변경 실패')
      return
    }

    // 🔄 방 목록 갱신
    const listRes = await fetch('/api/chat/rooms', {
      headers: {
        Authorization: `Bearer ${currentUser.token}`,
      },
    })
    setRooms(await listRes.json())
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
      alert('이미지 업로드 실패')
      return
    }

    const { url, name } = await uploadRes.json()

    // 2. 메시지 저장
    await fetch('/api/chat/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser.token}`,
      },
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

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

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
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, currentRoomId])

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
  const roomMessages = messages.filter((m) => m.roomId === currentRoomId)

  /* -------------------------
     메시지 전송 핸들러
  ------------------------- */
  const handleSendMessage = async () => {
    if (!currentRoomId || !inputText.trim()) return

    const trimmed = inputText.trim()

    const newMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      roomId: currentRoomId,
      senderId: currentUser?.id || 0,
      senderName: currentUser?.name || '나',
      content: trimmed,
      createdAt: new Date().toISOString(),
      type: isUrl(trimmed) ? 'url' : 'text',
    }

    // 프론트 상태에만 추가 (나중에 /api/chat/send-message로 교체)
    setMessages((prev) => [...prev, newMessage])
    setInputText('')

    await apiFetch('/api/chat/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId: currentRoomId,
        type: newMessage.type,
        content: newMessage.content,
      }),
    })

    /* 🔥 여기 추가 */
    const res = await fetch(`/api/chat/messages/${currentRoomId}`, {
      headers: {
        Authorization: `Bearer ${currentUser?.token}`,
      },
    })
    const data = await res.json()
    setMessages(Array.isArray(data) ? data : [])
  }
  useEffect(() => {
    if (!currentRoomId || !currentUser?.token) return

    fetch(`/api/chat/messages/${currentRoomId}`, {
      headers: {
        Authorization: `Bearer ${currentUser.token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          setMessages([])
          return
        }
        const data = await res.json()
        setMessages(Array.isArray(data) ? data : [])
      })
      .catch(() => setMessages([]))
  }, [currentRoomId, currentUser?.token])

  /* -------------------------
     파일 선택 핸들러 (UI만)
  ------------------------- */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return

    const files = Array.from(e.target.files)

    for (const file of files) {
      // 🖼 이미지
      if (file.type.startsWith('image/')) {
        await handleSendImage(file)
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

  const handleDeleteMessage = async (messageId: string) => {
    if (!currentUser?.token) return
    if (!confirm('이 메시지를 삭제하시겠습니까?')) return

    const res = await fetch(`/api/chat/messages/delete/${messageId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${currentUser.token}`,
      },
    })

    if (!res.ok) {
      alert('메시지 삭제 실패')
      return
    }

    // 🔄 메시지 다시 불러오기
    const list = await fetch(`/api/chat/messages/${currentRoomId}`, {
      headers: {
        Authorization: `Bearer ${currentUser.token}`,
      },
    })

    const data = await safeJson<ChatMessage[]>(list)
    setMessages(Array.isArray(data) ? data : [])
  }

  const handleSendFile = async (file: File) => {
    if (!currentRoomId || !currentUser?.token) return

    const formData = new FormData()
    formData.append('file', file)

    // 1️⃣ S3 업로드
    const uploadRes = await fetch('/api/upload/chat', {
      method: 'POST',
      body: formData,
    })

    if (!uploadRes.ok) {
      alert('파일 업로드 실패')
      return
    }

    const { url, name } = await uploadRes.json()

    // 2️⃣ 메시지 저장
    await fetch('/api/chat/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser.token}`,
      },
      body: JSON.stringify({
        roomId: currentRoomId,
        type: 'file',
        fileUrl: url,
        fileName: name,
      }),
    })

    // 3️⃣ 메시지 갱신
    const res = await fetch(`/api/chat/messages/${currentRoomId}`, {
      headers: {
        Authorization: `Bearer ${currentUser.token}`,
      },
    })
    setMessages(await res.json())
  }

  return (
    <main
      ref={containerRef}
      style={{
        height: '100vh', // ✅ minHeight ❌ → height ✅
        paddingTop: isMobile ? 60 : 0, // 가독성도 좋아짐
        paddingBottom: 0, // ✅ 아래 여백 완전 제거
        background: '#e5f3ff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'stretch',
        overflow: 'hidden', // ✅ 스크롤 여백 방지
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '100%', // ✅ PC에서도 풀 폭
          height: isMobile ? 'calc(100vh - 60px)' : '100vh', // ✅ 둘 다 동일하게 (헤더 60px 제외)
          borderRadius: 0, // ✅ 둥근 모서리 제거
          display: 'flex',
          overflow: 'hidden',
          background: 'white',
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
              borderRight: isMobile ? 'none' : '1px solid #e5e7eb',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid #e5e7eb',
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
                }}
              >
                <span>학교 채팅</span>
              </div>
              <span style={{ fontSize: 12, color: '#6b7280' }}>
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
                borderBottom: '1px solid #e5e7eb',
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

                      // 🔥 읽음 처리
                      if (currentUser?.token) {
                        await fetch(`/api/chat/messages/${room.id}/read`, {
                          method: 'POST',
                          headers: {
                            Authorization: `Bearer ${currentUser.token}`,
                          },
                        })

                        // 🔄 방 목록 다시 불러와서 unreadCount 갱신
                        apiFetch('/api/chat/rooms')
                          .then((res) => safeJson<ChatRoom[]>(res))
                          .then((data) =>
                            setRooms(Array.isArray(data) ? data : []),
                          )
                      }
                      // ✅ 메시지 다시 불러오기 (readCount 즉시 반영)
                      fetch(`/api/chat/messages/${room.id}`, {
                        headers: {
                          Authorization: `Bearer ${currentUser.token}`,
                        },
                      })
                        .then((res) => res.json())
                        .then((data) =>
                          setMessages(Array.isArray(data) ? data : []),
                        )
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      background: isActive ? '#eff6ff' : 'white',
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
                          color: '#111827',
                          flex: 1,
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {room.name}

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
                            color: '#111827',
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
                              background: 'white',
                              borderRadius: 8,
                              boxShadow: '0 6px 18px rgba(0,0,0,0.15)',
                              border: '1px solid #e5e7eb',
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
                                setShowRoomMenu(false)
                                handleRenameRoom()
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <p
                      style={{
                        fontSize: 12,
                        color: '#6b7280',
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
                borderBottom: '1px solid #e5e7eb',
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
                      background: '#f3f4f6',
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
                        background: 'white',
                        borderRadius: 10,
                        boxShadow: '0 6px 18px rgba(0,0,0,0.15)',
                        border: '1px solid #e5e7eb',
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
                        label="➕ 초대"
                        onClick={() => {
                          setShowRoomMenu(false)
                          setInviteMode(
                            currentRoom.isGroup ? 'group' : 'oneToOne',
                          )
                          setShowInviteModal(true)
                        }}
                      />
                      <MenuItem
                        label="🚪 나가기"
                        onClick={() => {
                          setShowRoomMenu(false)
                          handleLeaveRoom()
                        }}
                      />
                      <MenuItem
                        label="🗑 삭제"
                        danger
                        onClick={() => {
                          setShowRoomMenu(false)
                          handleDeleteRoom()
                        }}
                      />
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
                    {currentRoom ? currentRoom.name : '채팅방을 선택하세요'}
                  </div>
                  {currentRoom && (
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {currentRoom.isGroup ? '그룹 채팅' : '1:1 채팅'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 메시지 영역 */}
            <div
              style={{
                flex: 1,
                padding: '12px 16px',
                overflowY: 'auto',
                background: '#f9fafb',
              }}
            >
              {!currentRoom && (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af',
                    fontSize: 14,
                  }}
                >
                  왼쪽에서 채팅방을 선택하거나 새 채팅을 시작하세요.
                </div>
              )}

              {currentRoom &&
                roomMessages.map((msg) => {
                  const isMe = msg.senderId === (currentUser?.id || 0)
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        justifyContent: isMe ? 'flex-end' : 'flex-start',
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '75%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isMe ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            color: '#6b7280',
                            marginBottom: 2,
                            paddingRight: 4,
                          }}
                        >
                          {isMe ? '나' : msg.senderName}
                        </span>
                        <div
                          style={{
                            padding:
                              msg.type === 'image' || msg.type === 'file'
                                ? 0
                                : '10px 14px',
                            borderRadius:
                              msg.type === 'image' || msg.type === 'file'
                                ? 0
                                : 12,
                            background:
                              msg.type === 'image' || msg.type === 'file'
                                ? 'transparent'
                                : isMe
                                  ? '#4FC3F7'
                                  : 'white',
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
                            <a
                              href={msg.content}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: isMe ? 'white' : '#2563eb',
                                textDecoration: 'underline',
                                wordBreak: 'break-all',
                              }}
                            >
                              {msg.content}
                            </a>
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
                              onClick={() => setPreviewImage(msg.fileUrl)}
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
                                background: isMe ? '#e0f2fe' : '#f3f4f6',
                                cursor: 'pointer',
                                maxWidth: 320,
                              }}
                              onClick={() => {
                                const encoded = encodeURIComponent(msg.fileUrl!)
                                window.open(`/api/chat/download?url=${encoded}`)
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
                                <div style={{ fontSize: 11, color: '#6b7280' }}>
                                  파일 다운로드
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            color: '#9ca3af',
                            marginTop: 2,
                            display: 'flex',
                            gap: 6,
                            alignItems: 'center',
                          }}
                        >
                          {formatKST(msg.createdAt)}

                          {/* 🔥 모든 메시지에 안 읽은 사람 수 표시 */}
                          {msg.readCount !== undefined && msg.readCount > 0 && (
                            <span style={{ color: '#2563eb', fontWeight: 600 }}>
                              {msg.readCount}
                            </span>
                          )}
                          {isMe && Number.isFinite(Number(msg.id)) && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
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

              <div ref={messagesEndRef} />
            </div>

            {/* 파일 프리뷰 */}
            {uploadingFiles.length > 0 && (
              <div
                style={{
                  padding: '6px 12px',
                  borderTop: '1px solid #e5e7eb',
                  background: '#f3f4f6',
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
                        background: 'white',
                        borderRadius: 999,
                        border: '1px solid #d1d5db',
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

            {/* 입력 영역 */}
            <div
              style={{
                padding: '8px 12px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
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
                    border: '1px solid #d1d5db',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    cursor: 'pointer',
                    background: '#f9fafb',
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
                      background: 'white',
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
                        setShowAttachMenu(false)
                        imageInputRef.current?.click()
                      }}
                    />
                    <AttachItem
                      icon="📄"
                      label="파일"
                      onClick={() => {
                        setShowAttachMenu(false)
                        fileInputRef.current?.click()
                      }}
                    />
                  </div>
                )}
              </div>

              <input
                type="text"
                placeholder={
                  currentRoom
                    ? '메시지를 입력하세요…'
                    : '채팅방을 먼저 선택하세요.'
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                disabled={!currentRoom}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 999,
                  border: '1px solid #d1d5db',
                  fontSize: 14,
                  outline: 'none',
                }}
              />

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!currentRoom || !inputText.trim()}
                style={{
                  width: 70,
                  height: 32,
                  borderRadius: 999,
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor:
                    currentRoom && inputText.trim() ? 'pointer' : 'default',
                  background:
                    currentRoom && inputText.trim() ? '#4FC3F7' : '#e5e7eb',
                  color: currentRoom && inputText.trim() ? 'white' : '#9ca3af',
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
          currentUserId={currentUser?.id}
          token={currentUser?.token}
        />
      )}

      {/* ================= 참여자 목록 모달 ================= */}
      {roomUsers.length > 0 && (
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
          onClick={() => setRoomUsers([])}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: 360,
              background: 'white',
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
                  padding: '8px 6px',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
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

                  <span style={{ fontSize: 11, color: '#6b7280' }}>
                    @{u.username}
                  </span>
                </div>

                {u.gradeLabel && (
                  <div style={{ fontSize: 12, color: '#4b5563' }}>
                    {u.gradeLabel}
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={() => setRoomUsers([])}
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

              {/* 닫기 */}
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  border: 'none',
                  background: '#e5e7eb',
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
  currentUserId, // ✅ 추가
  token, // ✅
}: {
  mode: 'oneToOne' | 'group'
  roomId: number | null
  onClose: () => void
  onCreate: (mode: 'oneToOne' | 'group', userIds: number[]) => Promise<void>

  schoolCode?: string
  currentUserId?: number // ✅ 추가
  token?: string
}) {
  const [tab, setTab] = useState<'name' | 'class'>('name')
  const [nameKeyword, setNameKeyword] = useState('')
  const [grade, setGrade] = useState<'1' | '2' | '3'>('1')
  const [classNum, setClassNum] = useState('')
  const [results, setResults] = useState<UserSummary[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])
  const [selectedUsers, setSelectedUsers] = useState<UserSummary[]>([])

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

    const res = await fetch(
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

    const res = await fetch(
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
    if (!currentUserId) return

    if (mode === 'oneToOne' && selectedUserIds.length !== 1) {
      alert('1:1 채팅은 한 명만 선택해야 합니다.')
      return
    }

    if (mode === 'group' && selectedUserIds.length < 2) {
      alert('그룹 채팅은 최소 3명부터 가능합니다.')
      return
    }

    // ✅ 기존 방 + 그룹 채팅 → 초대
    if (roomId && mode === 'group') {
      await fetch(`/api/chat/messages/${roomId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userIds: selectedUserIds,
        }),
      })

      onClose()
      return
    }

    // ❌ 그 외 경우만 새 채팅 생성
    await onCreate(mode, [...selectedUserIds, currentUserId])

    // 🔥 방 목록 강제 새로고침 (이게 핵심)
    if (token) {
      const res = await fetch('/api/chat/rooms', {
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
          background: 'white',
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
            background: '#f3f4f6',
            borderRadius: 999,
            padding: 2,
          }}
        >
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
              background: tab === 'name' ? 'white' : 'transparent',
              color: tab === 'name' ? '#111827' : '#6b7280',
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
                placeholder="예: 김민수"
                value={nameKeyword}
                onChange={(e) => setNameKeyword(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
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
            <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
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
                  border: '1px solid #d1d5db',
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
                  border: '1px solid #d1d5db',
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
            <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
              예: 1학년 3반 학생들만 불러오고 싶으면 학년=1, 반=3 으로 검색.
            </p>
          </div>
        )}

        {/* 검색 결과 리스트 */}
        <div
          style={{
            maxHeight: 220,
            overflowY: 'auto',
            borderRadius: 10,
            border: '1px solid #e5e7eb',
            padding: 6,
            background: '#f9fafb',
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
              return (
                <label
                  key={user.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    borderRadius: 8,
                    background: 'white',
                    marginBottom: 4,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSelect(user)}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#111827',
                      }}
                    >
                      {user.name}
                      <span
                        style={{
                          fontSize: 11,
                          color: '#6b7280',
                          marginLeft: 4,
                        }}
                      >
                        @{user.username}
                      </span>
                    </div>
                    {user.gradeLabel && (
                      <div
                        style={{
                          fontSize: 11,
                          color: '#4b5563',
                        }}
                      >
                        {user.gradeLabel}
                      </div>
                    )}
                  </div>
                </label>
              )
            })
          )}
        </div>

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
              border: '1px solid #d1d5db',
              background: 'white',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleCreateChat}
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
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
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
        color: danger ? '#ef4444' : '#111827',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {label}
    </button>
  )
}
