'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import type { UserRole } from '@/types'

/* ─── nav items ──────────────────────────────────────────── */
const NAV: { key: string; label: string; href: string; roles: UserRole[] }[] = [
  { key: 'dashboard', label: 'Дашборд',       href: '/dashboard',  roles: ['admin'] },
  { key: 'kc1',       label: 'Воронка КЦ-1',  href: '/kc1',        roles: ['admin','kc1','finance','reception'] },
  { key: 'kc2',       label: 'База КЦ-2',      href: '/kc2',        roles: ['admin','kc2','finance','lawyer','reception'] },
  { key: 'reception', label: 'Рецепшен',       href: '/reception',  roles: ['admin','reception'] },
  { key: 'doctors',   label: 'Врачи',          href: '/doctors',    roles: ['admin','doctor'] },
  { key: 'finance',   label: 'Финансы',        href: '/finance',    roles: ['admin','finance'] },
  { key: 'lawyer',    label: 'Возвраты',       href: '/lawyer',     roles: ['admin','lawyer'] },
  { key: 'refunds',   label: 'Запросы возврата',href: '/refunds',    roles: ['admin','lawyer'] },
  { key: 'admin',     label: 'Управление',     href: '/admin',      roles: ['admin'] },
]

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Администратор', kc1: 'КЦ-1', kc2: 'КЦ-2',
  finance: 'Финансист', lawyer: 'Юрист', reception: 'Рецепшен', doctor: 'Врач',
}

const ROLE_DOT: Record<UserRole, string> = {
  admin: '#C9A96E', kc1: '#3A6EA5', kc2: '#3D7A5C',
  finance: '#9A6B1A', lawyer: '#B84040', reception: '#5B6FA6', doctor: '#3D7A5C',
}

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const { profile, role, loading, signOut } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !profile) router.replace('/login')
  }, [loading, profile, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#ECE7E2' }}>
        <div style={{ fontFamily: 'Forum, serif', fontSize: 26, color: '#20364A', opacity: .5 }}>
          T&D Clinic
        </div>
      </div>
    )
  }
  if (!profile || !role) return null

  const visibleNav = NAV.filter(n => n.roles.includes(role))
  const activeLabel = visibleNav.find(n => pathname === n.href || pathname.startsWith(n.href + '/'))?.label ?? 'T&D Clinic'

  const handleLogout = async () => {
    await signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Open Sans', system-ui, sans-serif" }}>

      {/* ═══════ SIDEBAR ═══════════════════════════════ */}
      <aside style={{
        width: 210, flexShrink: 0,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: '#20364A',
      }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ fontFamily: 'Forum, serif', fontSize: 15, color: '#fff', letterSpacing: '.06em' }}>T&D Clinic</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.35)', letterSpacing: '.15em', textTransform: 'uppercase', marginTop: 2 }}>
            Aesthetic Medicine
          </div>
        </div>

        {/* Role badge */}
        <div style={{
          margin: '9px 12px',
          padding: '5px 10px', borderRadius: 20,
          fontSize: 10, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(255,255,255,.07)',
          color: 'rgba(255,255,255,.85)',
          border: '1px solid rgba(255,255,255,.1)',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: ROLE_DOT[role], flexShrink: 0 }} />
          {ROLE_LABEL[role]}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', padding: '8px 14px 3px', letterSpacing: '.1em', textTransform: 'uppercase' }}>
            Навигация
          </div>
          {visibleNav.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.key} href={item.href} style={{
                display: 'flex', alignItems: 'center',
                padding: '8px 14px', fontSize: 11,
                color: active ? '#fff' : 'rgba(255,255,255,.55)',
                background: active ? 'rgba(196,92,60,.2)' : 'transparent',
                borderLeft: `2px solid ${active ? '#C45C3C' : 'transparent'}`,
                fontWeight: active ? 500 : 400,
                textDecoration: 'none',
                transition: 'all .15s',
              }}>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: '10px 12px 14px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '8px 10px', marginBottom: 8,
            background: 'rgba(255,255,255,.05)',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 9,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: '#C45C3C', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>
              {(profile.full_name ?? '?')[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile.full_name}
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.35)', marginTop: 1 }}>
                {ROLE_LABEL[role]}
              </div>
            </div>
          </div>

          <button onClick={handleLogout} style={{
            width: '100%', padding: '7px',
            background: 'rgba(255,255,255,.05)',
            border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 8, cursor: 'pointer',
            fontSize: 10, color: 'rgba(255,255,255,.4)',
            fontFamily: 'inherit', transition: 'all .15s',
          }}
          onMouseOver={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'rgba(196,92,60,.15)'
            el.style.color = '#F09090'
            el.style.borderColor = 'rgba(196,92,60,.3)'
          }}
          onMouseOut={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'rgba(255,255,255,.05)'
            el.style.color = 'rgba(255,255,255,.4)'
            el.style.borderColor = 'rgba(255,255,255,.1)'
          }}>
            Выйти из системы
          </button>
        </div>
      </aside>

      {/* ═══════ MAIN ═══════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Topbar — NO global "+ New Lead" button */}
        <header style={{
          padding: '0 20px', height: 52,
          borderBottom: '1px solid #DDD8D0',
          background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
          boxShadow: '0 1px 4px rgba(32,54,74,.07)',
        }}>
          <div style={{ fontFamily: 'Forum, serif', fontSize: 16, color: '#20364A', letterSpacing: '.02em' }}>
            {activeLabel}
          </div>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: '#20364A', color: '#ECE7E2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700,
          }}>
            {(profile.full_name ?? '?')[0].toUpperCase()}
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#F5F2EE' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
