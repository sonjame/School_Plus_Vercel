'use client'

import React, { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'

interface Props {
  value: string
  onChange: (html: string) => void
  darkMode?: boolean
}

export default function RichTextEditor({
  value,
  onChange,
  darkMode = false,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [value, editor])

  if (!editor) return null

  return (
    <>
      <div
        style={{
          border: darkMode ? '1px solid #334155' : '1px solid #d1d5db',
          borderRadius: 10,
          overflow: 'hidden',
          background: darkMode ? '#0f172a' : '#fff',
        }}
      >
        {/* 🔥 상단 툴바 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 12px',
            borderBottom: darkMode ? '1px solid #334155' : '1px solid #e5e7eb',
            background: darkMode ? '#1e293b' : '#f8fafc',
            overflowX: 'auto', // ⭐ 가로 스크롤
            whiteSpace: 'nowrap',
          }}
        >
          {/* 제목 드롭다운 */}
          <select
            onChange={(e) => {
              const value = Number(e.target.value)

              if (value === 0) {
                editor.chain().focus().setParagraph().run()
                return
              }

              const level = value as 1 | 2 | 3 | 4 | 5 | 6

              editor.chain().focus().toggleHeading({ level }).run()
            }}
            style={{
              padding: '4px 6px',
              borderRadius: 6,
              border: darkMode ? '1px solid #475569' : '1px solid #cbd5e1',
              background: darkMode ? '#1e293b' : '#ffffff',
              color: darkMode ? '#f1f5f9' : '#111827',
            }}
          >
            <option value="0">본문</option>
            <option value="2">제목 1</option>
            <option value="3">제목 2</option>
          </select>

          <IconBtn
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            icon="format_bold"
            darkMode={darkMode}
          />

          <IconBtn
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            icon="format_italic"
            darkMode={darkMode}
          />

          <IconBtn
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            icon="format_underlined"
            darkMode={darkMode}
          />

          <IconBtn
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            icon="format_strikethrough"
            darkMode={darkMode}
          />

          <Divider darkMode={darkMode} />

          <ColorBtn color="#111827" editor={editor} darkMode={darkMode} />
          <ColorBtn color="#EF4444" editor={editor} darkMode={darkMode} />
          <ColorBtn color="#3B82F6" editor={editor} darkMode={darkMode} />
          <ColorBtn color="#10B981" editor={editor} darkMode={darkMode} />
          <ColorBtn color="#F59E0B" editor={editor} darkMode={darkMode} />

          <Divider darkMode={darkMode} />

          <IconBtn
            active={editor.isActive({ textAlign: 'left' })}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            icon="format_align_left"
            darkMode={darkMode}
          />

          <IconBtn
            active={editor.isActive({ textAlign: 'center' })}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            icon="format_align_center"
            darkMode={darkMode}
          />

          <IconBtn
            active={editor.isActive({ textAlign: 'right' })}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            icon="format_align_right"
            darkMode={darkMode}
          />

          <Divider darkMode={darkMode} />

          <IconBtn
            active={false}
            onClick={() => editor.chain().focus().undo().run()}
            icon="undo"
            darkMode={darkMode}
          />

          <IconBtn
            active={false}
            onClick={() => editor.chain().focus().redo().run()}
            icon="redo"
            darkMode={darkMode}
          />
        </div>

        {/* 본문 */}
        <EditorContent
          editor={editor}
          style={{
            padding: 16,
            minHeight: 250,
            cursor: 'text',
            color: darkMode ? '#f1f5f9' : '#111827',
          }}
        />
      </div>
      <style jsx global>{`
        .ProseMirror {
          line-height: 1.4;
          font-family: 'Pretendard', 'Noto Sans KR', sans-serif;
          outline: none;
        }

        .dark .ProseMirror {
          color: #f1f5f9;
        }

        .ProseMirror p {
          margin: 0 !important;
        }

        .ProseMirror h1,
        .ProseMirror h2,
        .ProseMirror h3,
        .ProseMirror h4,
        .ProseMirror h5,
        .ProseMirror h6 {
          margin: 0 !important;
        }
      `}</style>
    </>
  )
}

function IconBtn({
  icon,
  onClick,
  active,
  darkMode,
}: {
  icon: string
  onClick: () => void
  active: boolean
  darkMode: boolean
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      style={{
        border: 'none',
        outline: 'none',
        boxShadow: 'none',
        background: active ? (darkMode ? '#334155' : '#e0f2fe') : 'transparent',
        color: darkMode ? '#f1f5f9' : '#111827',
        padding: 6,
        borderRadius: 6,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <span className="material-symbols-rounded">{icon}</span>
    </button>
  )
}

function Divider({ darkMode }: { darkMode: boolean }) {
  return (
    <div
      style={{
        width: 1,
        height: 20,
        background: darkMode ? '#475569' : '#cbd5e1',
      }}
    />
  )
}

function ColorBtn({
  color,
  editor,
  darkMode,
}: {
  color: string
  editor: any
  darkMode: boolean
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        editor.chain().focus().setColor(color).run()
      }}
      style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        border: editor.isActive('textStyle', { color })
          ? `2px solid ${darkMode ? '#fff' : '#000'}`
          : `1px solid ${darkMode ? '#64748b' : '#ccc'}`,
        background: color,
        cursor: 'pointer',
      }}
    />
  )
}
