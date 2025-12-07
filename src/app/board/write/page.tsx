'use client';

import { useEffect, useState } from 'react';
import type React from 'react';

export default function WritePage() {
  const [category, setCategory] = useState('free');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);

  /* 🔥 투표 기능 */
  const [voteEnabled, setVoteEnabled] = useState(false);
  const [voteOptions, setVoteOptions] = useState<string[]>(['', '']);
  const [voteEndAt, setVoteEndAt] = useState<string>('');

  /* 🔥 중앙 팝업용 상태 */
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState('');
  const [tempHour, setTempHour] = useState('12');
  const [tempMinute, setTempMinute] = useState('00');
  const [tempAmPm, setTempAmPm] = useState<'오전' | '오후'>('오후');

  /* 모달 */
  const [modal, setModal] = useState({
    show: false,
    message: '',
    onConfirm: () => { },
  });

  const showAlert = (msg: string, callback?: () => void) => {
    setModal({
      show: true,
      message: msg,
      onConfirm: () => {
        setModal(prev => ({ ...prev, show: false }));
        if (callback) callback();
      },
    });
  };

  /* 카테고리 로드 */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('category');
    if (c) setCategory(c);
  }, []);

  /* 이미지 업로드 */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  /* 투표 옵션 변경 */
  const updateOption = (index: number, value: string) => {
    setVoteOptions(prev => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  /* 옵션 추가 */
  const addOption = () => {
    if (voteOptions.length >= 6) {
      showAlert('옵션은 최대 6개까지 가능합니다.');
      return;
    }
    setVoteOptions(prev => [...prev, '']);
  };

  /* 옵션 삭제 */
  const removeOption = (i: number) => {
    setVoteOptions(prev => prev.filter((_, idx) => idx !== i));
  };

  /* 글 작성 */
  const submit = () => {
    if (!title.trim() || !content.trim()) {
      showAlert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    if (voteEnabled) {
      const filled = voteOptions.map(v => v.trim()).filter(Boolean);

      if (filled.length < 2) {
        showAlert('투표는 최소 2개 이상의 옵션이 필요합니다.');
        return;
      }

      if (!voteEndAt) {
        showAlert('투표 마감 시간을 설정해주세요.');
        return;
      }

      const endTime = new Date(voteEndAt).getTime();
      if (endTime <= Date.now()) {
        showAlert('마감 시간은 현재 시각 이후여야 합니다.');
        return;
      }
    }

    const raw = localStorage.getItem('loggedInUser');
    let authorName = '익명';

    try {
      const obj = JSON.parse(raw || '{}');
      authorName = obj.name || obj.username || '익명';
    } catch { }

    const storageKey = `board_${category}`;
    const boardList = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const allPosts = JSON.parse(localStorage.getItem('posts_all') || '[]');

    const nowVote = voteEnabled
      ? {
        enabled: true,
        endAt: voteEndAt || null,
        options: voteOptions
          .map(t => t.trim())
          .filter(Boolean)
          .map(t => ({
            text: t,
            votes: 0,
            voters: [] as string[],
          })),
      }
      : { enabled: false };

    const newPost = {
      id: crypto.randomUUID(),
      title,
      content,
      images,
      author: authorName,
      category,
      likes: 0,
      createdAt: Date.now(),
      vote: nowVote,
    };

    localStorage.setItem(storageKey, JSON.stringify([newPost, ...boardList]));
    localStorage.setItem('posts_all', JSON.stringify([newPost, ...allPosts]));

    showAlert('작성 완료!', () => {
      window.location.href = `/board/${category}`;
    });
  };

  /* 🔥 마감시간 중앙 모달에서 확인 */
  const applyVoteTime = () => {
    if (!tempDate) return;

    let hour = parseInt(tempHour);
    if (tempAmPm === '오후' && hour !== 12) hour += 12;
    if (tempAmPm === '오전' && hour === 12) hour = 0;

    const iso = `${tempDate}T${String(hour).padStart(2, '0')}:${tempMinute}`;
    setVoteEndAt(iso);
    setShowPicker(false);
  };

  return (
    <>
      <div style={pageWrap}>
        <div style={card}>
          <h2 style={titleStyle}>글쓰기</h2>

          {/* 카테고리 */}
          <label style={label}>카테고리</label>
          <div style={{ ...inputBox, background: '#ECEFF1', fontWeight: 600 }}>
            {category === 'free'
              ? '자유게시판'
              : category === 'promo'
                ? '홍보게시판'
                : category === 'club'
                  ? '동아리게시판'
                  : `${category.replace('grade', '')}학년 게시판`}
          </div>

          {/* 제목 */}
          <label style={label}>제목</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            style={inputBox}
          />

          {/* 내용 */}
          <label style={label}>내용</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="내용을 입력하세요"
            style={textArea}
          />

          {/* 투표 스위치 */}
          <div style={{ marginTop: 26, marginBottom: 14 }}>
            <label style={{ ...label, marginBottom: 6 }}>투표 만들기</label>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
              onClick={() => setVoteEnabled(v => !v)}
            >
              <div
                style={{
                  width: 45,
                  height: 24,
                  borderRadius: 12,
                  background: voteEnabled ? '#4FC3F7' : '#B0BEC5',
                  position: 'relative',
                  transition: '0.2s',
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#fff',
                    position: 'absolute',
                    top: 2,
                    left: voteEnabled ? 22 : 2,
                    transition: '0.2s',
                  }}
                />
              </div>
              <span style={{ fontWeight: 600 }}>
                {voteEnabled ? '활성화됨' : '끄기'}
              </span>
            </div>
          </div>

          {/* 투표 옵션 */}
          {voteEnabled && (
            <div style={{ marginTop: 8 }}>
              {voteOptions.map((opt, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', gap: 8, marginBottom: 10 }}
                >
                  <input
                    style={{ ...inputBox, flex: 1 }}
                    placeholder={`옵션 ${i + 1}`}
                    value={opt}
                    onChange={e => updateOption(i, e.target.value)}
                  />
                  {voteOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      style={{
                        padding: '8px 12px',
                        background: '#ECEFF1',
                        borderRadius: 10,
                        border: '1px solid #ccc',
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              {/* 🔥 투표 마감 시간 */}
              <div style={{ marginTop: 20 }}>
                <label style={label}>투표 마감 시간</label>

                <div
                  onClick={() => setShowPicker(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: '1.5px solid #CFD8DC',
                    borderRadius: 12,
                    padding: '12px 14px',
                    background: '#FFFFFF',
                    cursor: 'pointer',
                    gap: 10,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    flex: 1,
                  }}
                >
                  <span className="material-symbols-rounded" style={{ color: '#0288D1', fontSize: 22 }}>
                    schedule
                  </span>

                  <span
                    style={{
                      flex: 1,
                      color: voteEndAt ? '#263238' : '#90A4AE',
                      fontSize: 15,
                      overflow: 'hidden',         // 🔥 칸 넘침 방지
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {voteEndAt
                      ? new Date(voteEndAt).toLocaleString('ko-KR', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                      : '마감 시간을 선택하세요'}
                  </span>

                  <span className="material-symbols-rounded" style={{ color: '#546E7A', fontSize: 22 }}>
                    event
                  </span>
                </div>



                <p style={{ fontSize: 13, color: '#78909C', marginTop: 6 }}>
                  투표 종료 후에는 투표가 불가능합니다.
                </p>
              </div>

              <button
                type="button"
                onClick={addOption}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 12,
                  background: '#E1F5FE',
                  color: '#0277BD',
                  fontWeight: 700,
                  border: '1px solid #B3E5FC',
                  cursor: 'pointer',
                  marginTop: 6,
                }}
              >
                + 옵션 추가
              </button>
            </div>
          )}

          {/* 이미지 */}
          <input
            id="uploadImage"
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handleImageUpload}
          />

          <label htmlFor="uploadImage" style={uploadBtn}>
            <span className="material-symbols-rounded" style={uploadBtnIcon}>
              image
            </span>
            사진 업로드
          </label>

          {images.length > 0 && (
            <div style={previewGrid}>
              {images.map((src, idx) => (
                <div key={idx} style={previewBox}>
                  <img src={src} style={previewImg} />
                  <button
                    style={deleteBtn}
                    onClick={() =>
                      setImages(prev => prev.filter((_, i) => i !== idx))
                    }
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <button onClick={submit} style={submitBtn}>
            등록하기
          </button>
        </div>
      </div>

      {/* ❗ 중앙 투표시간 모달 */}
      {showPicker && (
        <div style={centerModalBg}>
          <div style={centerModalBox}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: 20, fontWeight: 700 }}>
              투표 마감 시간
            </h3>

            {/* 날짜 */}
            <div style={centerDateInputWrapper}>
              <input
                type="date"
                value={tempDate}
                onChange={(e) => setTempDate(e.target.value)}
                style={centerDateInput}
              />


            </div>

            {/* 시간 */}
            <div style={centerTimeRow}>
              <select
                value={tempAmPm}
                onChange={e => setTempAmPm(e.target.value as '오전' | '오후')}
                style={centerSelect}
              >
                <option value="오전">오전</option>
                <option value="오후">오후</option>
              </select>

              <select
                value={tempHour}
                onChange={e => setTempHour(e.target.value)}
                style={centerSelect}
              >
                {Array.from({ length: 12 }, (_, i) =>
                  String(i + 1).padStart(2, '0')
                ).map(v => (
                  <option key={v}>{v}</option>
                ))}
              </select>

              <select
                value={tempMinute}
                onChange={e => setTempMinute(e.target.value)}
                style={centerSelect}
              >
                {['00', '10', '20', '30', '40', '50'].map(v => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>

            <div style={centerBtnRow}>
              <button
                style={centerCancelBtn}
                onClick={() => setShowPicker(false)}
              >
                취소
              </button>

              <button style={centerOkBtn} onClick={applyVoteTime}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 기존 alert 모달 */}
      {modal.show && (
        <div style={modalBg}>
          <div style={modalBox}>
            <p>{modal.message}</p>
            <button style={btnBlue} onClick={modal.onConfirm}>
              확인
            </button>
          </div>
        </div>
      )}


    </>
  );
}

/* ------------------------------------------------------------ */
/* --------------------------- STYLE --------------------------- */
/* ------------------------------------------------------------ */

const pageWrap: React.CSSProperties = {
  background: '#F3F6FA',
  minHeight: '100vh',
  padding: '40px 20px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
  fontFamily: 'Inter, sans-serif',
};

const card: React.CSSProperties = {
  width: '100%',
  maxWidth: 720,
  background: '#fff',
  padding: '36px 40px',
  borderRadius: 20,
  boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
  border: '1px solid #E3EAF3',
  marginTop: 20,
};

const titleStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  display: 'flex',
  alignItems: 'center',
  color: '#0277BD',
  marginBottom: 28,
  letterSpacing: '-0.3px',
};

const label: React.CSSProperties = {
  fontWeight: 600,
  marginTop: 22,
  marginBottom: 10,
  fontSize: 15,
  color: '#37474F',
  display: 'block',
};

const inputBox: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 12,
  border: '1.5px solid #CFD8DC',
  background: '#F9FAFB',
  fontSize: '15px',
  outline: 'none',
  boxSizing: 'border-box',
};

const textArea: React.CSSProperties = {
  width: '100%',
  height: 220,
  padding: '14px 16px',
  borderRadius: 12,
  border: '1.5px solid #CFD8DC',
  background: '#F9FAFB',
  fontSize: '15px',
  resize: 'vertical',
  outline: 'none',
  boxSizing: 'border-box',
  lineHeight: 1.6,
};

const uploadBtn: React.CSSProperties = {
  marginTop: 26,
  marginBottom: 20,
  width: '100%',
  padding: '14px 0',
  borderRadius: 12,
  background: '#E3F2FD',
  color: '#0277BD',
  fontWeight: 700,
  fontSize: 16,
  cursor: 'pointer',
  textAlign: 'center',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
};

const uploadBtnIcon: React.CSSProperties = {
  fontSize: 22,
};

const previewGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
  gap: '14px',
  marginTop: '10px',
  marginBottom: '14px',
};

const previewBox: React.CSSProperties = {
  position: 'relative',
  borderRadius: 10,
  overflow: 'hidden',
  border: '1px solid #ddd',
};

const previewImg: React.CSSProperties = {
  width: 110,
  height: 110,
  objectFit: 'cover',
  borderRadius: 12,
  boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
};

const deleteBtn: React.CSSProperties = {
  position: 'absolute',
  top: 4,
  right: 4,
  background: '#fff',
  width: 26,
  height: 26,
  borderRadius: '50%',
  border: '1px solid #ccc',
  cursor: 'pointer',
  fontWeight: 600,
};

const submitBtn: React.CSSProperties = {
  width: '100%',
  padding: '16px 0',
  marginTop: 30,
  background: 'linear-gradient(90deg, #4FC3F7, #0288D1)',
  border: 'none',
  borderRadius: 14,
  color: 'white',
  fontWeight: 800,
  fontSize: 17,
  cursor: 'pointer',
  boxShadow: '0 5px 14px rgba(2,136,209,0.25)',
};

/* 기존 alert 모달 */
const modalBg: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 999,
};

const modalBox: React.CSSProperties = {
  background: 'white',
  padding: '22px',
  borderRadius: 12,
  width: 300,
  textAlign: 'center',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
};

const btnBlue: React.CSSProperties = {
  background: '#4FC3F7',
  color: 'white',
  padding: '8px 14px',
  borderRadius: 6,
  border: 'none',
  fontWeight: 600,
  cursor: 'pointer',
};

/* 중앙 모달 (투표시간) */

const centerModalBg: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.35)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 99999,
};

const centerModalBox: React.CSSProperties = {
  width: '90%',
  maxWidth: 420,
  background: '#fff',
  padding: '24px 26px',
  borderRadius: 14,
  boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
  textAlign: 'center',
};

const centerDateInputWrapper: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  border: "1.5px solid #CFD8DC",
  borderRadius: 12,
  padding: "10px 14px",
  background: "#FFFFFF",
  marginBottom: 16,
  gap: 10,
  overflow: "hidden",
  boxSizing: "border-box",
};


const centerDateInput: React.CSSProperties = {
  flex: 1,
  border: "none",
  outline: "none",
  fontSize: 15,
  padding: "4px 0",
  appearance: "none",
  WebkitAppearance: "none",
  minWidth: 0,         // ← 텍스트 길어질 때 줄바꿈 방지
};





const centerTimeRow: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  marginBottom: 18,
};

const centerSelect: React.CSSProperties = {
  flex: 1,
  padding: '10px',
  borderRadius: 10,
  border: '1.5px solid #CFD8DC',
  fontSize: 16,
};

const centerBtnRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  marginTop: 10,
};

const centerCancelBtn: React.CSSProperties = {
  padding: '10px 18px',
  background: '#ddd',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
};

const centerOkBtn: React.CSSProperties = {
  padding: '10px 18px',
  background: '#4FC3F7',
  color: 'white',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
};

const voteTimeWrapper = {}; // 이미 다른 방식으로 개선됨


