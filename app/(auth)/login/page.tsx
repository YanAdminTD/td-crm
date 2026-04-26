'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'

const PILLARS = [
  'Единый стандарт сервиса',
  'Забота о каждом клиенте',
  'Контроль качества на каждом этапе',
]

export default function LoginPage() {
  const { signIn } = useAuth()
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPwd, setShowPwd]   = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) { setError('Введите email и пароль.'); return }
    setError('')
    setLoading(true)
    const { error } = await signIn(email.trim(), password)
    if (error) { setError(error); setLoading(false) }
    else router.replace('/dashboard')
  }

  return (
    <div className="min-h-screen flex" style={{
      background: '#0D1D2E',
      fontFamily: "'Open Sans', system-ui, sans-serif",
    }}>
      {/* background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[
          { tw: '-top-40 -left-40 w-[500px] h-[500px]', bg: '#1C3A54' },
          { tw: '-top-20 -right-32 w-[420px] h-[420px]', bg: '#C45C3C' },
          { tw: 'bottom-0 left-1/3 w-[350px] h-[350px]',  bg: '#777967' },
        ].map((b, i) => (
          <div key={i}
            className={`absolute rounded-full blur-[80px] opacity-[.11] ${b.tw}`}
            style={{ background: b.bg }} />
        ))}
      </div>

      {/* ── LEFT PANEL ─────────────────────────── */}
      <div className="relative z-10 flex-1 hidden lg:flex flex-col justify-center px-14 py-12">
        <Link href="/landing" className="flex items-center gap-3 mb-16" style={{ textDecoration: 'none' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ border: '1.5px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.06)' }}>
            <span style={{ fontFamily: 'Forum, serif', fontSize: 13, color: '#fff', letterSpacing: '.06em' }}>T&D</span>
          </div>
          <div>
            <div style={{ fontFamily: 'Forum, serif', fontSize: 15, color: '#fff', letterSpacing: '.06em' }}>T&D Clinic</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.35)', letterSpacing: '.18em', textTransform: 'uppercase', marginTop: 2 }}>Aesthetic Medicine</div>
          </div>
        </Link>

        <h2 style={{
          fontFamily: 'Forum, serif', lineHeight: 1.15, color: '#fff',
          fontSize: 'clamp(28px, 3vw, 42px)', marginBottom: 16,
        }}>
          Добро пожаловать<br />
          в <span style={{ color: '#C9A96E' }}>T&D Clinic</span>
        </h2>

        <p style={{
          fontSize: 14, lineHeight: 1.8, fontWeight: 300,
          color: 'rgba(255,255,255,.45)', maxWidth: 400, marginBottom: 40,
        }}>
          Каждая запись, каждый визит и каждая процедура — часть премиального
          сервиса, который мы создаём для наших клиентов.
        </p>

        <div style={{ width: 48, height: 2, background: '#C9A96E', borderRadius: 1, marginBottom: 32 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {PILLARS.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(201,169,110,.12)', border: '1px solid rgba(201,169,110,.3)',
              }}>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M2 5.5L4.5 8L9 3" stroke="#C9A96E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>{p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL: form ──────────────────── */}
      <div className="relative z-10 w-full lg:w-[460px] flex items-center justify-center p-8 lg:p-12">
        <div style={{
          width: '100%', maxWidth: 400,
          background: 'rgba(255,255,255,.04)',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 20, padding: '36px 32px',
          backdropFilter: 'blur(20px)',
        }}>
          {/* mobile logo */}
          <div className="lg:hidden mb-8">
            <div style={{ fontFamily: 'Forum, serif', fontSize: 20, color: '#fff', letterSpacing: '.06em' }}>T&D Clinic</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.35)', letterSpacing: '.15em', textTransform: 'uppercase', marginTop: 2 }}>Aesthetic Medicine</div>
          </div>

          <div style={{ fontFamily: 'Forum, serif', fontSize: 22, color: '#fff', marginBottom: 6 }}>
            Вход в систему
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', marginBottom: 28, lineHeight: 1.6 }}>
            Введите рабочую почту и пароль.
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && (
              <div style={{
                background: 'rgba(184,64,64,.15)', border: '1px solid rgba(184,64,64,.3)',
                borderRadius: 8, padding: '9px 13px', fontSize: 11, color: '#F09090',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="6.5" r="6" stroke="#F09090" strokeWidth="1.2"/>
                  <path d="M6.5 4v3.5M6.5 9v.5" stroke="#F09090" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}

            {/* email */}
            <div>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,.35)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 7 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@td-clinic.kz" autoComplete="email" required disabled={loading}
                style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, fontSize: 13, color: '#fff', fontFamily: 'inherit', outline: 'none' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(201,169,110,.5)')}
                onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,.12)')} />
            </div>

            {/* password */}
            <div>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,.35)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 7 }}>Пароль</label>
              <div style={{ position: 'relative' }}>
                <input type={showPwd ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  autoComplete="current-password" required disabled={loading}
                  style={{ width: '100%', padding: '12px 40px 12px 14px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, fontSize: 13, color: '#fff', fontFamily: 'inherit', outline: 'none' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(201,169,110,.5)')}
                  onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,.12)')} />
                <button type="button" onClick={() => setShowPwd(p => !p)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.3)', padding: 3 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                    <path d="M1 8C2.7 4.7 5.1 3 8 3s5.3 1.7 7 5c-1.7 3.3-4.1 5-7 5S2.7 11.3 1 8z"/>
                    <circle cx="8" cy="8" r="2.2"/>
                  </svg>
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px',
              background: '#C45C3C', color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 13, fontWeight: 600, letterSpacing: '.06em',
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              marginTop: 4, opacity: loading ? .6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 6px 20px rgba(196,92,60,.28)',
            }}>
              {loading && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="7" cy="7" r="6" stroke="rgba(255,255,255,.4)" strokeWidth="1.5"/>
                  <path d="M7 1A6 6 0 0 1 13 7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
              {loading ? 'Выполняется вход...' : 'Войти в систему'}
            </button>
          </form>

          <Link href="/landing" style={{ display: 'block', textAlign: 'center', marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,.2)', textDecoration: 'none' }}>
            ← На главную
          </Link>
        </div>
      </div>

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
