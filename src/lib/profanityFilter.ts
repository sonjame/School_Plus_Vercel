// src/lib/profanityFilter.ts

const bannedWords = [
  '시발',
  '씨발',
  '병신',
  'ㅂㅅ',
  '개새끼',
  '개세끼',
  '좆',
  '존나',
  '지랄',
  '꺼져',
  '미친놈',
  '니애미',
  '니엄마',
  '씨발새끼',
  '애미',
  'ㅅㅂ',
  'ㄳㄲ',
  'ㄱ ㅐ ㅅ ㅐ ㄲ ㅣ',
  '새끼',
  '세끼',
  '이새끼',
]

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '') // 공백 제거
    .replace(/[~!@#$%^&*()_\-+=|\\{}[\]:;"'<>,.?/]/g, '') // 특수문자 제거
}

export function containsProfanity(text: string) {
  const normalized = normalize(text)

  return bannedWords.some((word) => {
    const w = normalize(word)
    return normalized.includes(w)
  })
}
