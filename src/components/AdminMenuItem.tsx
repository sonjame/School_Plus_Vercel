import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminMenuItem({
  icon,
  label,
  href,
}: {
  icon: string
  label: string
  href: string
}) {
  const pathname = usePathname()
  const active = pathname === href

  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 10,

        /* ✅ 배경 */
        background: active
          ? 'linear-gradient(135deg, #1E40AF, #1E3A8A)' // 진한 네이비 강조
          : '#0F172A', // 기본 다크 네이비

        /* ✅ 폰트 */
        color: '#FFFFFF',
        fontWeight: 700,
        fontSize: 15,
        textDecoration: 'none',

        /* ✅ 테두리 & 그림자 */
        border: active
          ? '1px solid rgba(255,255,255,0.25)'
          : '1px solid rgba(255,255,255,0.08)',
        boxShadow: active ? '0 6px 16px rgba(30,64,175,0.45)' : 'none',

        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = '#1E293B' // hover 네이비
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = '#0F172A'
        }
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      {label}
    </Link>
  )
}
