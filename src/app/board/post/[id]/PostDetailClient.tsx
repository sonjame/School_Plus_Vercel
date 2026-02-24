'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type React from 'react'
import { apiFetch } from '@/src/lib/apiFetch'

export default function PostDetailPage() {
  const params = useParams<{ id: string }>()
  const postId = params.id
  const router = useRouter()

  const [post, setPost] = useState<any>(null)
  const [storageKey] = useState<string>('')

  const [comments, setComments] = useState<any[]>([])
  const [username, setUsername] = useState<string>('')
  const [myName, setMyName] = useState<string>('') // 실명 저장

  const [commentValue, setCommentValue] = useState('')
  const [replyTarget, setReplyTarget] = useState<string | null>(null)
  const [replyValue, setReplyValue] = useState('')

  const [editId, setEditId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const [menuOpen, setMenuOpen] = useState(false)
  const [isAuthor, setIsAuthor] = useState(false)

  const [scrapped, setScrapped] = useState(false)

  const [reportOpen, setReportOpen] = useState(false)
  const [reportType, setReportType] = useState('')
  const [reportText, setReportText] = useState('')

  // 🔍 이미지 뷰어 (확대)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerImage, setViewerImage] = useState<string | null>(null)
  const [viewerIndex, setViewerIndex] = useState(0)

  const [openCommentMenu, setOpenCommentMenu] = useState<string | null>(null)

  /* 🔒 댓글 작성 권한 (학년별) */
  const myGrade =
    typeof window !== 'undefined' ? localStorage.getItem('userGrade') : null

  const isGradeBoard =
    post && ['grade1', 'grade2', 'grade3'].includes(post.category)

  // 🔥 관리자 게시판은 학년 제한 제외
  const canComment =
    post?.category === 'admin' || !isGradeBoard || post?.category === myGrade

  /* 🔥 투표 관련 상태 */
  const [myVoteIndex, setMyVoteIndex] = useState<number | null>(null)
  const [totalVotes, setTotalVotes] = useState(0)

  const [myUserId, setMyUserId] = useState<number | null>(null)

  // ✅ 신고 상태 분리
  const [reportedPost, setReportedPost] = useState(false)
  const [reportedComments, setReportedComments] = useState<
    Record<string, boolean>
  >({})

  const [reportTarget, setReportTarget] = useState<{
    type: 'post' | 'comment'
    id: string
  } | null>(null)

  const [banInfo, setBanInfo] = useState<{
    reason: string
    remainHours?: number
  } | null>(null)

  const checkBanAndAlert = async (): Promise<boolean> => {
    const token = localStorage.getItem('accessToken')
    if (!token) return false

    const res = await fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (res.status === 403) {
      const data = await res.json()

      setBanInfo({
        reason: data.reason,
        remainHours: data.remainHours,
      })

      return true // 🚫 정지 상태
    }

    return false // ✅ 정상
  }

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
    const uid = localStorage.getItem('userId')
    if (uid) setMyUserId(Number(uid))
  }, [])

  const [modal, setModal] = useState({
    show: false,
    message: '',
    type: 'alert' as 'alert' | 'confirm',
    onConfirm: () => {},
    onCancel: () => {},
  })

  /* 모달 */
  const showAlert = (msg: string, callback?: () => void) => {
    setModal({
      show: true,
      message: msg,
      type: 'alert',
      onConfirm: () => {
        setModal((m) => ({ ...m, show: false }))
        if (callback) callback()
      },
      onCancel: () => {},
    })
  }

  const showConfirm = (msg: string, yesFn: () => void) => {
    setModal({
      show: true,
      message: msg,
      type: 'confirm',
      onConfirm: () => {
        setModal((m) => ({ ...m, show: false }))
        yesFn()
      },
      onCancel: () => setModal((m) => ({ ...m, show: false })),
    })
  }

  /* ------------------------------------------
     게시글 + 댓글 로딩
  ------------------------------------------- */
  useEffect(() => {
    async function loadPost() {
      const userId = localStorage.getItem('userId')
      if (!userId) {
        showAlert('로그인이 필요합니다.', () => router.push('/login'))
        return
      }

      const res = await apiFetch(`/api/posts/${postId}`)
      if (res.status === 404) {
        showAlert('🚫 신고 누적으로 숨김 처리된 게시글입니다.', () =>
          router.push('/board'),
        )
        return
      }

      if (!res.ok) {
        showAlert('게시글을 찾을 수 없습니다.', () => router.push('/board'))
        return
      }

      const data = await res.json()
      setPost(data)
    }

    loadPost()
  }, [postId])

  /* 🔥 댓글 로딩 (DB) */
  useEffect(() => {
    async function loadComments() {
      const res = await apiFetch(`/api/posts/${postId}/comments`)

      if (!res.ok) return

      const data = await res.json()
      setComments(Array.isArray(data) ? data : [])
    }

    loadComments()
  }, [postId])

  /* 🔥 스크랩 상태 초기 동기화 */
  useEffect(() => {
    async function loadScrapStatus() {
      const userId = localStorage.getItem('userId')
      if (!userId || !postId) return

      const res = await apiFetch(`/api/posts/${postId}/scrap`)

      if (!res.ok) return

      const data = await res.json()
      setScrapped(data.scrapped)
    }

    loadScrapStatus()
  }, [postId])

  useEffect(() => {
    const name = localStorage.getItem('name')
    const username = localStorage.getItem('username')

    if (name) setMyName(name)
    if (username) setUsername(username)
  }, [])

  /* 게시글 작성자 체크 */
  useEffect(() => {
    if (!post || myUserId === null) return
    setIsAuthor(post.user_id === myUserId)
  }, [post, myUserId])

  /* 스크랩 여부 */

  /* 🔥 투표 관련 계산 (총 투표수, 내 선택 옵션 인덱스) */
  useEffect(() => {
    if (!post || !post.vote?.enabled || !Array.isArray(post.vote.options)) {
      setTotalVotes(0)
      setMyVoteIndex(null)
      return
    }

    const options = post.vote.options

    const total = options.reduce(
      (sum: number, opt: any) => sum + (opt.votes || 0),
      0,
    )
    setTotalVotes(total)

    // ⭐ 서버에서 내려준 값 그대로 사용
    setMyVoteIndex(
      typeof post.vote.myVoteIndex === 'number' ? post.vote.myVoteIndex : null,
    )
  }, [post])

  /* ------------------------------------------
     댓글 트리 생성
  ------------------------------------------- */
  function buildTree(arr: any[], parent: string | null = null): any[] {
    return arr
      .filter((c) => c.parent === parent)
      .map((c) => ({
        ...c,
        children: buildTree(arr, c.id),
      }))
  }

  const commentTree = buildTree(comments)

  /* ------------------------------------------
     댓글 작성 (실명)
  ------------------------------------------- */

  const writeComment = async () => {
    if (await checkBanAndAlert()) return

    if (!canComment) {
      showAlert('해당 학년 게시판에는 댓글을 작성할 수 없습니다.')
      return
    }

    if (!commentValue.trim()) return

    const res = await apiFetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        content: commentValue,
        parent: null,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      showAlert(data?.message || '댓글 작성에 실패했습니다.')
      return
    }

    const newComment = await res.json()
    setComments((prev) => [...prev, newComment])
    setCommentValue('')
  }

  /* ------------------------------------------
     대댓글 작성 (실명)
  ------------------------------------------- */
  const writeReply = async () => {
    if (await checkBanAndAlert()) return

    if (!canComment) {
      showAlert('해당 학년 게시판에는 댓글을 작성할 수 없습니다.')
      return
    }

    if (!replyValue.trim() || !replyTarget) return

    const res = await apiFetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        content: replyValue,
        parent: replyTarget,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      showAlert(data?.message || '답글 작성에 실패했습니다.')
      return
    }

    const newReply = await res.json()
    setComments((prev) => [...prev, newReply])
    setReplyValue('')
    setReplyTarget(null)
  }

  /* 댓글 수정 */
  const saveEdit = async () => {
    if (!editId) return

    const res = await apiFetch(`/api/comments/${editId}`, {
      method: 'PUT',
      body: JSON.stringify({ content: editValue }),
    })

    if (!res.ok) return showAlert('댓글 수정 실패')

    setComments((prev) =>
      prev.map((c) => (c.id === editId ? { ...c, content: editValue } : c)),
    )

    setEditId(null)
    setEditValue('')
  }

  /* 댓글 삭제 */
  const deleteComment = async (id: string) => {
    showConfirm('댓글을 삭제하시겠습니까?', async () => {
      const res = await apiFetch(`/api/comments/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) return showAlert('댓글 삭제 실패')

      setComments((prev) => prev.filter((c) => c.id !== id && c.parent !== id))
    })
  }

  /* 게시글 삭제 */
  const deletePost = async () => {
    showConfirm('게시글을 삭제하시겠습니까?', async () => {
      const userId = localStorage.getItem('userId')
      if (!userId) {
        showAlert('로그인이 필요합니다.')
        return
      }

      const res = await apiFetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        showAlert('삭제 권한이 없거나 오류가 발생했습니다.')
        return
      }

      showAlert('게시글이 삭제되었습니다.', () => {
        router.push('/board')
      })
    })
  }

  /* 게시글을 로컬스토리지에 동기화 (좋아요/투표 등 공용) */
  const updatePostInStorage = (updatedPost: any) => {
    if (!updatedPost || !updatedPost.id) return

    const sync = (key: string) => {
      const list = JSON.parse(localStorage.getItem(key) || '[]')

      const updatedList = list.map((p: any) => {
        if (p.id !== updatedPost.id) return p

        // 🔥 기존 options map을 optionId 기준으로 저장하기 위해 dictionary 생성
        const oldOptionsMap = (p.vote?.options || []).reduce(
          (acc: any, opt: any) => {
            acc[opt.optionId] = opt // 기존 voters data 보존
            return acc
          },
          {},
        )

        let mergedVote = p.vote

        // vote 업데이트가 포함되어있다면 병합 처리
        if (updatedPost.vote) {
          mergedVote = {
            ...p.vote,
            ...updatedPost.vote,
            options: updatedPost.vote.options
              ? updatedPost.vote.options.map((newOpt: any) => {
                  const oldOpt = oldOptionsMap[newOpt.optionId] || {}

                  return {
                    ...oldOpt, // 🔥 기존 voters 유지
                    ...newOpt, // 새 텍스트, 새 votes 반영
                    voters: Array.isArray(newOpt.voters)
                      ? newOpt.voters
                      : oldOpt.voters || [], // voters 보존
                    votes:
                      typeof newOpt.votes === 'number'
                        ? newOpt.votes
                        : oldOpt.votes || 0,
                  }
                })
              : p.vote.options,
          }
        }

        return {
          ...p,
          ...updatedPost,
          vote: mergedVote,
        }
      })

      localStorage.setItem(key, JSON.stringify(updatedList))
    }

    if (storageKey) sync(storageKey)
    sync('posts_all')
  }

  /* 좋아요 */
  const handleLike = async () => {
    const userId = localStorage.getItem('userId')
    if (!userId) return showAlert('로그인이 필요합니다.')

    const res = await apiFetch(`/api/posts/${postId}/like`, {
      method: 'POST',
      body: JSON.stringify({ userId: Number(userId) }),
    })

    if (!res.ok) {
      showAlert('좋아요 처리 실패')
      return
    }

    const data = await res.json()
    setPost((prev: any) => ({ ...prev, likes: data.likes }))
  }

  /* ------------------------------------------
   스크랩 (북마크)
------------------------------------------- */
  const toggleScrap = async () => {
    const userId = localStorage.getItem('userId')
    if (!userId) return showAlert('로그인이 필요합니다.')

    const res = await apiFetch(`/api/posts/${postId}/scrap`, {
      method: 'POST',
    })

    if (!res.ok) {
      showAlert('스크랩 처리 실패')
      return
    }

    const data = await res.json()
    setScrapped(data.scrapped)
  }

  const copyLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    showAlert('링크가 복사되었습니다!')
  }

  /* 🔥 투표 클릭 처리 (투표 취소 + 재투표 지원) */
  const handleVote = async (index: number) => {
    if (!post || !post.vote?.enabled) return

    const token = localStorage.getItem('accessToken')
    if (!token) {
      showAlert('로그인이 필요합니다.')
      return
    }

    const res = await apiFetch(`/api/posts/${postId}/vote`, {
      method: 'POST',
      body: JSON.stringify({
        optionIndex: index,
      }),
    })

    if (!res.ok) {
      showAlert('투표 처리 실패')
      return
    }

    // 🔥 다시 서버에서 게시글을 불러온다
    const refreshed = await apiFetch(`/api/posts/${postId}`)

    const data = await refreshed.json()
    setPost(data)
  }

  /* 댓글 좋아요 */
  const toggleCommentLike = async (commentId: string) => {
    const res = await apiFetch(`/api/comments/${commentId}/like`, {
      method: 'POST',
    })

    if (!res.ok) return showAlert('댓글 좋아요 실패')

    const data = await res.json()

    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              likes: data.likes,
              likedByMe: !c.likedByMe, // 🔥 핵심
            }
          : c,
      ),
    )
  }

  /* ------------------------------------------
     댓글 렌더링
  ------------------------------------------- */
  const renderComments = (list: any[], depth = 0) =>
    list.map((c) => {
      const isWriter = c.user_id === myUserId
      const canManageComment = isWriter || isAdmin

      const isReply = depth > 0

      return (
        <div key={c.id}>
          {/* ✅ 댓글 박스 (여기만 margin 적용) */}
          <div
            style={{
              marginLeft: isReply ? 24 : 0,
              background: isReply
                ? darkMode
                  ? '#0f172a'
                  : '#F6F7F9'
                : darkMode
                  ? '#1e293b'
                  : '#FFFFFF',
              border: darkMode ? '1px solid #334155' : '1px solid #E5E7EB',
              padding: isReply ? '10px 12px' : '14px',
              borderRadius: 8,
              marginBottom: 6,
              position: 'relative',
            }}
          >
            {/* 🔥 에타 스타일 왼쪽 세로 라인 (답글만) */}
            {isReply && (
              <div
                style={{
                  position: 'absolute',
                  left: -16,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: '#E5E7EB',
                  borderRadius: 2,
                }}
              />
            )}

            {/* 메뉴 버튼 */}
            <button
              style={getMenuBtn(darkMode)}
              onClick={() =>
                setOpenCommentMenu(openCommentMenu === c.id ? null : c.id)
              }
            >
              ⋮
            </button>

            {openCommentMenu === c.id && (
              <div style={commentMenuBox}>
                <button
                  style={{
                    ...commentMenuItem,
                    color: reportedComments[c.id] ? '#9CA3AF' : undefined,
                    cursor: reportedComments[c.id] ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => {
                    if (reportedComments[c.id]) {
                      showAlert('이미 신고한 댓글입니다.')
                      return
                    }

                    setOpenCommentMenu(null)
                    setReportTarget({ type: 'comment', id: c.id })
                    setReportOpen(true)
                  }}
                >
                  🚩 {reportedComments[c.id] ? '신고 완료됨' : '신고하기'}
                </button>

                {canManageComment && (
                  <>
                    <button
                      style={commentMenuItem}
                      onClick={() => {
                        setEditId(c.id)
                        setEditValue(c.content)
                      }}
                    >
                      ✏ 수정하기
                    </button>
                    <button
                      style={commentMenuItemRed}
                      onClick={() => deleteComment(c.id)}
                    >
                      🗑 삭제하기
                    </button>
                  </>
                )}
              </div>
            )}

            {editId === c.id ? (
              <div>
                <textarea
                  style={getTextBox(darkMode)}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                />

                {/* 🔥 버튼 영역 */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={btnBlue} onClick={saveEdit}>
                    저장
                  </button>
                  <button style={btnGray} onClick={() => setEditId(null)}>
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 댓글 내용 */}
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    lineHeight: 1.5,
                    color: darkMode ? '#e2e8f0' : '#111827',
                  }}
                >
                  {c.content}
                </div>

                {/* 작성자 / 시간 */}
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    color: darkMode ? '#94a3b8' : '#6B7280',
                  }}
                >
                  {c.author} · {new Date(c.created_at).toLocaleString()}
                </div>

                {/* 좋아요 */}
                <button
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: c.likedUsers?.includes(username)
                      ? '#E91E63'
                      : '#9CA3AF',
                    fontSize: 12,
                    cursor: 'pointer',
                    marginTop: 6,
                    marginRight: 8,
                  }}
                  onClick={() => toggleCommentLike(c.id)}
                >
                  💙 {c.likes || 0}
                </button>

                {/* 🔥 답글 버튼은 부모 댓글 + 권한 있을 때만 */}
                {canComment && (
                  <button
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#2563EB',
                      fontSize: 12,
                      cursor: 'pointer',
                      marginTop: 6,
                    }}
                    onClick={() => {
                      setReplyTarget(c.id)
                      setReplyValue(`@${c.author} `)
                    }}
                  >
                    ↪ 답글
                  </button>
                )}
              </>
            )}

            {/* 답글 입력창 */}
            {replyTarget === c.id && (
              <div
                style={{
                  marginTop: 10,
                  marginLeft: 24,
                  background: darkMode ? '#0f172a' : '#F9FAFB',
                  border: darkMode ? '1px solid #334155' : '1px solid #E5E7EB',
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <textarea
                  style={{
                    ...getTextBox(darkMode),
                    marginBottom: 8,
                  }}
                  value={replyValue}
                  onChange={(e) => setReplyValue(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={btnBlue} onClick={writeReply}>
                    답글 작성
                  </button>
                  <button style={btnGray} onClick={() => setReplyTarget(null)}>
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
          {c.children?.length > 0 && (
            <div>{renderComments(c.children, depth + 1)}</div>
          )}
        </div>
      )
    })

  /* ------------------------------------------ */

  if (!post)
    return <p style={{ padding: '20px' }}>게시글을 찾을 수 없습니다.</p>

  const myLevel =
    typeof window !== 'undefined' ? localStorage.getItem('level') : null

  const isAdmin = myLevel === 'admin'

  // 🚫 숨김 게시글 처리 (관리자는 예외)
  if (post.is_hidden && myLevel !== 'admin') {
    return (
      <div
        style={{
          padding: 40,
          textAlign: 'center',
          color: '#6B7280',
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        🚫 신고 누적으로 숨김 처리된 게시글입니다.
      </div>
    )
  }

  const created = new Date(post.created_at)

  const dateStr = created.toLocaleString()

  /* 🔥 투표 마감 여부 */
  const isVoteEnded =
    post?.vote?.endAt && new Date() > new Date(post.vote.endAt)

  const hasVote =
    !!post.vote &&
    post.vote.enabled === true &&
    Array.isArray(post.vote.options)

  const alreadyVoted = myVoteIndex !== null

  function getBoardListPath(category: string) {
    return `/board/${category}`
  }

  return (
    <div
      className="post-detail-root"
      style={{
        minHeight: '100vh',
        background: darkMode ? '#0f172a' : '#f1f5f9',
        color: darkMode ? '#f1f5f9' : '#111827',
        paddingTop: 15,
      }}
    >
      {/* 🚫 계정 정지 모달 */}
      {banInfo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
          }}
        >
          <div
            style={{
              width: '90%',
              maxWidth: '420px',
              background: '#fff',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }}
          >
            <h2 style={{ color: '#d32f2f', marginBottom: '12px' }}>
              🚫 계정 이용 제한
            </h2>

            <p
              style={{ fontSize: '15px', color: '#444', marginBottom: '12px' }}
            >
              {banInfo.reason}
            </p>

            {banInfo.remainHours !== undefined && (
              <p style={{ fontSize: '14px', color: '#666' }}>
                남은 정지 시간: <strong>{banInfo.remainHours}시간</strong>
              </p>
            )}

            <p style={{ fontSize: '14px', color: '#555', marginTop: '10px' }}>
              현재 계정은 <strong>게시글·댓글 작성이 제한</strong>되어 있습니다.
            </p>

            <button
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                background: '#4FC3F7',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => setBanInfo(null)}
            >
              확인
            </button>
          </div>
        </div>
      )}
      <div
        style={{
          maxWidth: 'min(1200px, 98vw)',
          margin: '0 auto',
          padding: 'clamp(12px, 2vw, 18px) clamp(10px, 2vw, 16px)',
          marginTop: 'clamp(16px, 4vw, 32px)',
        }}
      >
        <h3
          style={{
            color: '#4FC3F7',
            marginBottom: '16px',
            fontSize: 'clamp(20px, 2.5vw, 28px)', // 🔥 크기 업
            fontWeight: 600, // 🔥 타이틀 느낌
            lineHeight: 1.2,
          }}
        >
          {post.category === 'free'
            ? '📢 자유게시판'
            : post.category === 'promo'
              ? '📣 홍보게시판'
              : post.category === 'club'
                ? '🎭 동아리게시판'
                : post.category === 'admin'
                  ? '🛠 관리자 게시판'
                  : `🎓 ${post.category.replace('grade', '')}학년 게시판`}
        </h3>

        {/* 게시글 카드 */}
        <div style={getPostCard(darkMode)}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={getMenuBtn(darkMode)}
          >
            ⋮
          </button>

          {menuOpen && (
            <div style={menuBox}>
              {(isAuthor || isAdmin) && (
                <button
                  style={menuItem}
                  onClick={() => router.push(`/board/post/${postId}/edit`)}
                >
                  ✏ 수정하기
                </button>
              )}

              {/* 🔗 링크 복사 */}
              {/* 🔗 링크 복사 (관리자 제외) */}
              {!isAdmin && (
                <button
                  style={menuItem}
                  onClick={() => {
                    copyLink()
                    setMenuOpen(false)
                  }}
                >
                  🔗 게시물 공유
                </button>
              )}

              {/* 🚩 신고하기 (관리자 + 작성자 제외) */}
              {!isAdmin && !isAuthor && (
                <button
                  style={menuItem}
                  onClick={() => {
                    if (reportedPost) {
                      showAlert('이미 신고한 게시글입니다.')
                      return
                    }
                    setReportTarget({ type: 'post', id: postId })
                    setReportOpen(true)
                  }}
                >
                  🚩 {reportedPost ? '신고 완료됨' : '신고하기'}
                </button>
              )}

              {(isAuthor || isAdmin) && (
                <button style={menuItemRed} onClick={deletePost}>
                  🗑 삭제하기
                </button>
              )}
            </div>
          )}

          <div
            style={{
              padding: '10px 22px',
              fontSize: '14px',
              background: darkMode ? '#0f172a' : '#F0F8FF',
              borderRadius: '12px 12px 0 0',
            }}
          >
            <button
              onClick={() => {
                if (post?.category) {
                  router.push(getBoardListPath(post.category))
                } else {
                  router.push('/board')
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 6,
                background: 'transparent',
                border: 'none',
                color: '#4FC3F7',
                fontSize: 20,
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: 8,
                paddingLeft: 0,
              }}
            >
              ❮ 뒤로가기
            </button>
            <strong>{post.author}</strong> ·{' '}
            <span style={{ color: '#999' }}>{dateStr}</span>
          </div>

          <div
            style={{
              padding: '20px',
              background: darkMode ? '#0f172a' : '#F0F8FF',
            }}
          >
            <h2
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: darkMode ? '#f1f5f9' : '#111827',
              }}
            >
              {post.title}
            </h2>
          </div>

          {/* 이미지 (여러장 or 단일) */}
          {Array.isArray(post.images) && post.images.length > 0 && (
            <div
              style={{
                padding: '16px 20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: 12,
              }}
            >
              {post.images.map((src: string, i: number) => (
                <img
                  key={i}
                  src={src}
                  onClick={() => {
                    setViewerIndex(i)
                    setViewerImage(src)
                    setViewerOpen(true)
                  }}
                  style={{
                    width: '100%',
                    height: 140,
                    objectFit: 'cover',
                    borderRadius: 10,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    cursor: 'zoom-in',
                  }}
                />
              ))}
            </div>
          )}

          {/* 🔗 첨부 링크 / 영상 */}
          {Array.isArray(post.attachments) && post.attachments.length > 0 && (
            <div style={{ padding: '12px 20px' }}>
              <h4
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  marginBottom: 8,
                  color: darkMode ? '#e2e8f0' : '#37474F',
                }}
              >
                🎬 첨부
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {post.attachments.map(
                  (a: { type: 'link' | 'video'; url: string }, idx: number) => {
                    // 🎬 유튜브 영상
                    if (a.type === 'video') {
                      const videoId = a.url.includes('youtu.be')
                        ? a.url.split('youtu.be/')[1]
                        : a.url.split('v=')[1]?.split('&')[0]

                      return (
                        <div key={idx} style={{ marginBottom: 10 }}>
                          <div
                            style={{
                              position: 'relative',
                              width: '100%',
                              aspectRatio: '16 / 9',
                              borderRadius: 12,
                              overflow: 'hidden',
                              background: '#000',
                            }}
                          >
                            <iframe
                              src={`https://www.youtube.com/embed/${videoId}`}
                              allowFullScreen
                              style={{
                                position: 'absolute',
                                inset: 0,
                                width: '100%',
                                height: '100%',
                                border: 'none',
                              }}
                            />
                          </div>
                        </div>
                      )
                    }

                    // 🔗 일반 링크
                    return (
                      <a
                        key={idx}
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '10px 14px',
                          borderRadius: 10,
                          border: darkMode
                            ? '1px solid #334155'
                            : '1px solid #CFD8DC',
                          textDecoration: 'none',
                          color: darkMode ? '#4FC3F7' : '#0288D1',
                          fontSize: 14,
                          fontWeight: 600,
                          background: darkMode ? '#0f172a' : '#F5FAFF',
                          wordBreak: 'break-all',
                          overflowWrap: 'anywhere',
                          maxWidth: '100%',
                        }}
                      >
                        🔗 {a.url}
                      </a>
                    )
                  },
                )}
              </div>
            </div>
          )}

          {!post.images && post.image && (
            <div style={{ padding: '16px 20px' }}>
              <img
                src={post.image}
                style={{
                  maxWidth: '100%',
                  borderRadius: 10,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              />
            </div>
          )}

          <div
            style={getPostBody(darkMode)}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* 🔥 투표 영역 (좋아요 버튼 위에 위치) */}
          {hasVote && (
            <div style={getVoteCard(darkMode)}>
              <div style={voteHeader}>
                <span style={{ fontWeight: 700 }}>투표</span>

                {/* 🔥 마감 안내 */}
                <span style={{ fontSize: 13, color: '#607D8B' }}>
                  총 {totalVotes}표{alreadyVoted && ' · 내가 참여함'}
                  {post.vote.endAt && (
                    <>
                      {' · '}
                      {isVoteEnded ? (
                        <span style={{ color: '#D32F2F', fontWeight: 700 }}>
                          마감됨
                        </span>
                      ) : (
                        <>마감 {new Date(post.vote.endAt).toLocaleString()}</>
                      )}
                    </>
                  )}
                </span>
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {post.vote.options.map((opt: any, idx: number) => {
                  const votes = opt.votes || 0
                  const percent =
                    totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
                  const isMyChoice = myVoteIndex === idx

                  return (
                    <button
                      key={idx}
                      onClick={() => !isVoteEnded && handleVote(idx)} // ⛔ 마감되면 클릭 막기
                      style={{
                        ...voteOptionRow,
                        borderColor: isMyChoice ? '#0288D1' : '#CFD8DC',
                        backgroundColor: isMyChoice ? '#E1F5FE' : '#FFFFFF',
                        cursor: isVoteEnded ? 'not-allowed' : 'pointer',
                        opacity: isVoteEnded ? 0.6 : 1, // ⛔ 흐리게 처리
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={voteOptionTop}>
                          <span style={{ fontWeight: 600 }}>{opt.text}</span>
                          <span style={{ fontSize: 13, color: '#546E7A' }}>
                            {votes}표 · {percent}%
                          </span>
                        </div>

                        <div style={voteBarTrack}>
                          <div
                            style={{
                              ...voteBarFill,
                              width: `${percent}%`,
                              opacity: percent === 0 ? 0.15 : 0.9,
                              background: isMyChoice
                                ? 'linear-gradient(90deg, #4FC3F7, #0288D1)'
                                : '#B0BEC5',
                            }}
                          />
                        </div>
                      </div>

                      {isMyChoice && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#0288D1',
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: '#E1F5FE',
                            marginLeft: 8,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          내 선택
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* 안내 문구 */}
              <p style={{ marginTop: 8, fontSize: 12, color: '#78909C' }}>
                {isVoteEnded
                  ? '⛔ 투표가 마감되었습니다.'
                  : '투표는 1회만 가능하며, 선택한 항목을 다시 누르면 취소됩니다.'}
              </p>
            </div>
          )}

          <div style={{ padding: '0 20px 20px' }}>
            <button style={btnBlue} onClick={handleLike}>
              💙 좋아요 {post.likes}
            </button>

            <button
              style={{
                padding: '8px 14px',
                background: scrapped ? '#FFB74D' : '#E0E0E0',
                borderRadius: '6px',
                marginLeft: '10px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
              }}
              onClick={toggleScrap}
            >
              {scrapped ? '⭐ 스크랩됨' : '☆ 스크랩'}
            </button>
          </div>
        </div>

        {/* 댓글 */}
        <div style={getCommentCard(darkMode)}>
          <h3 style={{ marginBottom: '10px' }}>💬 댓글</h3>

          {canComment ? (
            <>
              <textarea
                style={getTextBox(darkMode)}
                placeholder="댓글 입력..."
                value={commentValue}
                onChange={(e) => setCommentValue(e.target.value)}
              />
              <button style={btnBlue} onClick={writeComment}>
                댓글 작성
              </button>
            </>
          ) : (
            <div
              style={{
                padding: '12px',
                borderRadius: 8,
                background: darkMode ? '#0f172a' : '#F1F5F9',
                color: darkMode ? '#94a3b8' : '#64748B',
                fontSize: 14,
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              {post?.category === 'admin'
                ? '🔒 관리자 또는 문의 작성자만 댓글을 작성할 수 있습니다'
                : '🔒 해당 학년만 댓글을 작성할 수 있습니다'}
            </div>
          )}

          <hr style={{ margin: '20px 0' }} />

          {renderComments(commentTree)}
        </div>

        {/* 신고 모달 */}
        {reportOpen && (
          <div style={modalBg}>
            <div style={getReportBox(darkMode)}>
              <h3
                style={{
                  marginBottom: '12px',
                  fontSize: '18px',
                  fontWeight: 700,
                }}
              >
                🚨 신고하기
              </h3>

              <select
                style={inputBox}
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="">신고 유형 선택</option>
                <option value="욕설/비방">욕설/비방</option>
                <option value="정치/사회 갈등">정치/사회 갈등</option>
                <option value="광고/홍보">광고/홍보</option>
                <option value="기타">기타</option>
              </select>

              {reportType === '기타' && (
                <textarea
                  style={reportTextArea}
                  placeholder="신고 사유를 입력해주세요..."
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                />
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '12px',
                  marginTop: '14px',
                }}
              >
                <button style={btnGray} onClick={() => setReportOpen(false)}>
                  닫기
                </button>

                <button
                  style={btnBlue}
                  onClick={async () => {
                    if (!reportType) {
                      showAlert('신고 유형을 선택해주세요.')
                      return
                    }

                    const target = reportTarget
                    if (!target) return

                    const url =
                      target.type === 'post'
                        ? `/api/posts/${postId}/report`
                        : `/api/comments/${target.id}/report`

                    const res = await apiFetch(url, {
                      method: 'POST',
                      body: JSON.stringify({
                        type: reportType,
                        content: reportType === '기타' ? reportText : null,
                      }),
                    })

                    if (res.status === 409) {
                      showAlert('이미 신고한 항목입니다.')
                      return
                    }

                    if (!res.ok) {
                      showAlert('신고 처리 중 오류가 발생했습니다.')
                      return
                    }

                    // ✅ 성공 처리
                    if (target.type === 'post') {
                      setReportedPost(true)
                    } else {
                      setReportedComments((prev) => ({
                        ...prev,
                        [target.id]: true,
                      }))
                    }

                    setReportOpen(false)
                    setReportType('')
                    setReportText('')
                    setReportTarget(null)
                    showAlert('🚨 신고가 접수되었습니다.')
                  }}
                >
                  제출
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 공통 모달 */}
        {modal.show && (
          <div style={modalBg}>
            <div style={getModalBox(darkMode)}>
              <p>{modal.message}</p>

              <div
                style={{
                  marginTop: '10px',
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'center',
                }}
              >
                {modal.type === 'confirm' && (
                  <button style={btnGray} onClick={modal.onCancel}>
                    취소
                  </button>
                )}

                <button style={btnBlue} onClick={modal.onConfirm}>
                  확인
                </button>
              </div>
            </div>
          </div>
        )}

        {viewerOpen && viewerImage && post?.images && (
          <div
            onClick={() => setViewerOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 999999,
            }}
          >
            {/* ❌ 닫기 버튼 */}
            <button
              onClick={() => setViewerOpen(false)}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: 'rgba(0,0,0,0.6)',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 44,
                height: 44,
                fontSize: 22,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>

            {/* ⬅️ 이전 */}
            {post.images.length > 1 && viewerIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const newIndex = viewerIndex - 1
                  setViewerIndex(newIndex)
                  setViewerImage(post.images[newIndex])
                }}
                style={{
                  position: 'absolute',
                  left: 20,
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: 44,
                  height: 44,
                  fontSize: 24,
                  cursor: 'pointer',
                }}
              >
                ‹
              </button>
            )}

            {/* 이미지 */}
            <img
              src={viewerImage}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '90%',
                maxHeight: '90%',
                borderRadius: 14,
                boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
              }}
            />

            {/* ➡️ 다음 */}
            {post.images.length > 1 && viewerIndex < post.images.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const newIndex = viewerIndex + 1
                  setViewerIndex(newIndex)
                  setViewerImage(post.images[newIndex])
                }}
                style={{
                  position: 'absolute',
                  right: 20,
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: 44,
                  height: 44,
                  fontSize: 24,
                  cursor: 'pointer',
                }}
              >
                ›
              </button>
            )}
          </div>
        )}
        <style jsx>{`
          @media (min-width: 1024px) {
            .post-detail-root {
              padding-bottom: 120px;
            }
          }
        `}</style>
      </div>
    </div>
  )
}

/* -------------------- 스타일 -------------------- */

const getPostCard = (darkMode: boolean): React.CSSProperties => ({
  background: darkMode ? '#1e293b' : 'white',
  borderRadius: '12px',
  boxShadow: darkMode
    ? '0 4px 14px rgba(0,0,0,0.35)'
    : '0 4px 12px rgba(0,0,0,0.05)',
  marginBottom: '20px',
  position: 'relative',
})

const getPostBody = (darkMode: boolean): React.CSSProperties => ({
  padding: '20px',
  lineHeight: '1.7',
  fontSize: '16px',
  whiteSpace: 'pre-wrap',
  color: darkMode ? '#e2e8f0' : '#111827',
})

const getMenuBtn = (darkMode: boolean): React.CSSProperties => ({
  position: 'absolute',
  top: '10px',
  right: '14px',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontSize: '22px',
  color: darkMode ? '#ffffff' : '#111827',
})

const menuBox: React.CSSProperties = {
  position: 'absolute',
  top: '40px',
  right: '10px',
  background: 'white',
  border: '1px solid #ddd',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  padding: '6px 0',
  zIndex: 9999,
}

const menuItem: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  textAlign: 'left',
  background: 'white',
  border: 'none',
  cursor: 'pointer',
  fontSize: '14px',
}

const menuItemRed: React.CSSProperties = {
  ...menuItem,
  color: 'red',
}

const getCommentCard = (darkMode: boolean): React.CSSProperties => ({
  background: darkMode ? '#1e293b' : 'white',
  padding: '25px',
  borderRadius: '12px',
  boxShadow: darkMode
    ? '0 4px 14px rgba(0,0,0,0.35)'
    : '0 4px 12px rgba(0,0,0,0.05)',
})

const getTextBox = (darkMode: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '12px 14px',
  borderRadius: '10px',
  marginBottom: '14px',
  fontSize: '14px',
  boxSizing: 'border-box',
  border: darkMode ? '1.5px solid #334155' : '1.5px solid #cfd8dc',
  background: darkMode ? '#020617' : '#ffffff',
  color: darkMode ? '#e2e8f0' : '#111827',
})

const btnBlue: React.CSSProperties = {
  background: '#4FC3F7',
  color: 'white',
  padding: '8px 14px',
  borderRadius: '6px',
  border: 'none',
  fontWeight: 600,
  cursor: 'pointer',
}

const btnGray: React.CSSProperties = {
  background: '#ddd',
  padding: '8px 14px',
  borderRadius: '6px',
  border: 'none',
  cursor: 'pointer',
}

const btnSmall: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#4FC3F7',
  fontSize: '12px',
  cursor: 'pointer',
  marginTop: '6px',
}

const modalBg: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 9999,
}

const getModalBox = (darkMode: boolean): React.CSSProperties => ({
  background: darkMode ? '#1e293b' : 'white',
  color: darkMode ? '#f1f5f9' : '#111827',
  padding: '18px 16px',
  borderRadius: '12px',
  width: 'min(86vw, 300px)',
  textAlign: 'center',
})

const getReportBox = (darkMode: boolean): React.CSSProperties => ({
  background: darkMode ? '#1e293b' : '#ffffff',
  color: darkMode ? '#f1f5f9' : '#111827',
  padding: '18px 16px', // 🔥 줄임
  borderRadius: '10px',
  width: 'min(88vw, 360px)', // 🔥 420 → 360
  textAlign: 'center',
  boxShadow: darkMode
    ? '0 6px 20px rgba(0,0,0,0.45)'
    : '0 4px 18px rgba(0,0,0,0.12)',
  border: darkMode ? '1px solid #334155' : '1.5px solid #E3EAF3',
})

const inputBox: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  border: '1px solid #ccc',
  borderRadius: '8px',
  marginBottom: '10px',
}

const reportTextArea: React.CSSProperties = {
  width: '100%',
  minHeight: '110px',
  padding: '12px',
  border: '1.5px solid #D0D7DF',
  borderRadius: '10px',
  fontSize: '14px',
  resize: 'vertical',
  outlineColor: '#4FC3F7',
  background: '#FAFCFF',
  marginTop: '10px',
  boxSizing: 'border-box',
}

/* 🔥 투표 스타일 */
const getVoteCard = (darkMode: boolean): React.CSSProperties => ({
  margin: '0 20px 16px',
  padding: '16px 14px 12px',
  borderRadius: 14,
  background: darkMode ? '#0f172a' : '#F5FAFF',
  border: darkMode ? '1px solid #334155' : '1px solid #BBDEFB',
})

const voteHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const voteOptionRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '10px 10px',
  borderRadius: 12,
  border: '1px solid #CFD8DC',
  background: '#FFFFFF',
  gap: 8,
  transition: '0.2s',
}

const voteOptionTop: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 6,
}

const voteBarTrack: React.CSSProperties = {
  width: '100%',
  height: 8,
  borderRadius: 999,
  background: '#ECEFF1',
  overflow: 'hidden',
}

const voteBarFill: React.CSSProperties = {
  height: '100%',
  borderRadius: 999,
  transition: 'width 0.25s ease',
}

const commentMenuBox: React.CSSProperties = {
  position: 'absolute',
  top: 34, // 댓글 기준 살짝 아래
  right: 6,
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  boxShadow: '0 4px 10px rgba(0,0,0,0.18)',
  padding: '4px 0',
  zIndex: 9999,
  minWidth: 140, // 너무 넓어지지 않게
  maxWidth: 180,
}

const commentMenuItem: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px', // 🔥 기존보다 줄임
  textAlign: 'left',
  background: 'white',
  border: 'none',
  cursor: 'pointer',
  fontSize: 13, // 🔥 한 단계 작게
  lineHeight: 1.3,
}

const commentMenuItemRed: React.CSSProperties = {
  ...commentMenuItem,
  color: 'red',
}
