'use client'

import Link from 'next/link'

/* ─────────────────────────────────────────────────────────
   T&D Clinic — Premium Landing Page
   Colors: Navy #20364A · Cream #ECE7E2 · Gold #C9A96E
   ───────────────────────────────────────────────────────── */

const CARDS = [
  {
    num: '01',
    title: 'Запись клиентов',
    desc: 'Управление расписанием приёмов, первичных и повторных обращений. Все записи — в единой системе.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="14" height="14" rx="1.5"/>
        <path d="M7 1v4M13 1v4M3 8h14"/>
        <path d="M7 12h.01M10 12h.01M13 12h.01M7 15h.01M10 15h.01"/>
      </svg>
    ),
  },
  {
    num: '02',
    title: 'История процедур',
    desc: 'Полная хронология визитов по каждому клиенту с возможностью просмотра в любой момент.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="8"/>
        <path d="M10 6v4l2.5 2.5"/>
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Абонементы и посещения',
    desc: 'Учёт абонементных программ, контроль остатков процедур и уведомления о ближайших визитах.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="16" height="12" rx="1.5"/>
        <path d="M14 5V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v1"/>
        <path d="M10 10v4M8 12h4"/>
      </svg>
    ),
  },
  {
    num: '04',
    title: 'Контроль качества сервиса',
    desc: 'Мониторинг обратной связи, обработка обращений и поддержание стандартов клиники.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2l2.4 5 5.6.8-4 3.9.9 5.5L10 14.5l-4.9 2.7.9-5.5L2 7.8l5.6-.8z"/>
      </svg>
    ),
  },
]

const STATS = [
  { value: '24/7',  label: 'Доступ к системе' },
  { value: '∞',     label: 'Единая база клиентов' },
  { value: '100%',  label: 'Безопасное хранение данных' },
]

/* tiny helpers */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 10, color: 'rgba(236,231,226,.4)', letterSpacing: '.05em' }}>{label}</span>
      <span style={{ fontSize: 11, color: '#ECE7E2', fontWeight: 500 }}>{value}</span>
    </div>
  )
}
function MiniCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid rgba(32,54,74,.1)',
      borderRadius: 12, padding: '14px 14px',
    }}>
      <div style={{ fontSize: 9, color: '#8A9BAA', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'Forum, serif', fontSize: 22, color: '#20364A', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'rgba(32,54,74,.45)', marginTop: 4 }}>{sub}</div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen relative" style={{ background: '#ECE7E2', fontFamily: "'Open Sans', system-ui, sans-serif" }}>

      {/* Gold top line */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
        background: 'linear-gradient(90deg, transparent 8%, #C9A96E 35%, #E8D5AA 50%, #C9A96E 65%, transparent 92%)',
      }} />

      {/* Ambient light */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background:
          'radial-gradient(ellipse 90% 50% at 65% 30%, rgba(32,54,74,.055) 0%, transparent 70%),' +
          'radial-gradient(ellipse 50% 80% at 10% 80%, rgba(201,169,110,.06) 0%, transparent 60%)',
      }} />

      <div className="relative z-10 max-w-[1320px] mx-auto px-6 lg:px-14 flex flex-col min-h-screen">

        {/* ── NAV ─────────────────────────────────────── */}
        <nav className="flex items-center justify-between py-7 lg:py-9">
          <div className="flex items-center gap-3.5">
            <div className="w-[42px] h-[42px] rounded-full flex items-center justify-center flex-shrink-0"
              style={{ border: '1.5px solid rgba(32,54,74,.22)', background: 'rgba(32,54,74,.05)' }}>
              <span style={{ fontFamily: 'Forum, serif', fontSize: 13, color: '#20364A', letterSpacing: '.06em' }}>T&D</span>
            </div>
            <div>
              <div style={{ fontFamily: 'Forum, serif', fontSize: 16, color: '#20364A', letterSpacing: '.06em', lineHeight: 1 }}>T&D Clinic</div>
              <div style={{ fontSize: 9, color: '#8A9BAA', letterSpacing: '.2em', textTransform: 'uppercase', marginTop: 3 }}>Aesthetic Medicine</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a href="mailto:admin@td-clinic.kz" className="hidden sm:block"
              style={{ fontSize: 11, color: '#8A9BAA', letterSpacing: '.03em', textDecoration: 'none' }}>
              admin@td-clinic.kz
            </a>
            <Link href="/login" style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '9px 22px', borderRadius: 30,
              background: '#20364A', color: '#ECE7E2',
              fontSize: 11, fontWeight: 500, letterSpacing: '.06em',
              textDecoration: 'none',
            }}>
              Войти
            </Link>
          </div>
        </nav>

        {/* ── HERO ────────────────────────────────────── */}
        <main className="flex-1 flex flex-col lg:flex-row items-center gap-12 lg:gap-16 pt-6 pb-14 lg:pt-10 lg:pb-18">

          {/* Left */}
          <div className="flex-1 max-w-[580px]">

            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 mb-7" style={{
              padding: '5px 14px 5px 10px',
              border: '1px solid rgba(201,169,110,.35)',
              borderRadius: 30,
              background: 'rgba(201,169,110,.08)',
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C9A96E', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: '#C9A96E', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 500 }}>
                Закрытая платформа клиники
              </span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontFamily: 'Forum, serif',
              fontSize: 'clamp(30px, 4.2vw, 50px)',
              lineHeight: 1.1,
              color: '#20364A',
              marginBottom: 20,
              letterSpacing: '.01em',
            }}>
              Премиальная система<br />
              управления{' '}
              <span style={{ color: '#C9A96E' }}>T&D Clinic</span>
            </h1>

            {/* Sub */}
            <p style={{
              fontSize: 15, lineHeight: 1.78,
              color: 'rgba(32,54,74,.58)',
              fontWeight: 300, maxWidth: 480, marginBottom: 36,
            }}>
              Единое пространство для записи клиентов, контроля процедур
              и качества сервиса. Безопасно, удобно и всегда доступно.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap items-center gap-3 mb-14">
              <Link href="/login" style={{
                display: 'inline-flex', alignItems: 'center', gap: 9,
                padding: '13px 34px', borderRadius: 30,
                background: '#20364A', color: '#ECE7E2',
                fontSize: 13, fontWeight: 500, letterSpacing: '.06em',
                textDecoration: 'none',
                boxShadow: '0 8px 28px rgba(32,54,74,.2)',
              }}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="#C9A96E" strokeWidth="1.3"/>
                  <path d="M5 7h4M5 4.5h4M5 9.5h2" stroke="#C9A96E" strokeWidth="1.1" strokeLinecap="round"/>
                </svg>
                Войти в систему
              </Link>

              <a href="mailto:admin@td-clinic.kz" style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '12px 26px', borderRadius: 30,
                border: '1px solid rgba(32,54,74,.2)',
                background: 'transparent', color: '#20364A',
                fontSize: 13, fontWeight: 400, letterSpacing: '.04em',
                textDecoration: 'none',
              }}>
                Связаться с администратором
              </a>
            </div>

            {/* Stats strip */}
            <div className="flex gap-0 pt-7" style={{ borderTop: '1px solid rgba(32,54,74,.12)' }}>
              {STATS.map((s, i) => (
                <div key={i} style={{
                  flex: 1,
                  paddingLeft: i === 0 ? 0 : 24,
                  paddingRight: i === STATS.length - 1 ? 0 : 24,
                  borderRight: i < STATS.length - 1 ? '1px solid rgba(32,54,74,.1)' : 'none',
                }}>
                  <div style={{ fontFamily: 'Forum, serif', fontSize: 26, color: '#20364A', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: '#8A9BAA', letterSpacing: '.04em', marginTop: 5, textTransform: 'uppercase' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — mockup */}
          <div className="flex-shrink-0 w-full lg:w-[360px] xl:w-[400px]" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Main dark card */}
            <div style={{
              background: '#20364A',
              borderRadius: 18,
              padding: '26px 26px 22px',
              boxShadow: '0 20px 60px rgba(32,54,74,.22)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Gold top line */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                background: 'linear-gradient(90deg, transparent 10%, #C9A96E 40%, #E8D5AA 55%, #C9A96E 70%, transparent 90%)',
              }} />
              {/* Glow */}
              <div style={{
                position: 'absolute', top: -40, right: -40,
                width: 150, height: 150, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(201,169,110,.12) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 9, color: 'rgba(236,231,226,.4)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 5 }}>
                    Карточка клиента
                  </div>
                  <div style={{ fontFamily: 'Forum, serif', fontSize: 19, color: '#ECE7E2', letterSpacing: '.02em' }}>
                    Айгерим Н.
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(236,231,226,.4)', marginTop: 3 }}>ID: КЛ-2041 · VIP</div>
                </div>
                <div style={{
                  width: 42, height: 42, borderRadius: '50%',
                  background: 'rgba(201,169,110,.15)',
                  border: '1px solid rgba(201,169,110,.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontFamily: 'Forum, serif', fontSize: 16, color: '#C9A96E' }}>А</span>
                </div>
              </div>

              <div style={{ height: 1, background: 'rgba(236,231,226,.1)', marginBottom: 16 }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                <DetailRow label="Дата визита"  value="14 июня 2025" />
                <DetailRow label="Процедура"    value="Контурная пластика" />
                <DetailRow label="Специалист"   value="Карина Алматова" />
              </div>

              <div style={{
                marginTop: 18,
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '6px 13px', borderRadius: 30,
                background: 'rgba(201,169,110,.12)',
                border: '1px solid rgba(201,169,110,.25)',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A96E' }} />
                <span style={{ fontSize: 10, color: '#C9A96E', fontWeight: 500, letterSpacing: '.06em' }}>Подтверждено</span>
              </div>
            </div>

            {/* Mini cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <MiniCard label="Следующий визит" value="21 июня"  sub="Мезотерапия" />
              <MiniCard label="Абонемент"       value="8 / 10"  sub="Процедур пройдено" />
            </div>

            {/* Procedure list */}
            <div style={{
              background: '#fff', border: '1px solid rgba(32,54,74,.1)',
              borderRadius: 12, padding: '13px 15px',
            }}>
              <div style={{ fontSize: 9, color: '#8A9BAA', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 9 }}>
                Программа процедур
              </div>
              {[
                { name: 'Ботокс — лоб',      done: true },
                { name: 'Биоревитализация',   done: true },
                { name: 'Контурная пластика', done: false },
              ].map((p, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '7px 0',
                  borderBottom: i < 2 ? '1px solid rgba(32,54,74,.06)' : 'none',
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: p.done ? '#20364A' : 'transparent',
                    border: `1.5px solid ${p.done ? '#20364A' : 'rgba(32,54,74,.2)'}`,
                  }}>
                    {p.done && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4L3.2 6L6.5 2" stroke="#ECE7E2" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: p.done ? '#20364A' : '#8A9BAA', fontWeight: p.done ? 500 : 400 }}>
                    {p.name}
                  </span>
                  {p.done && (
                    <span style={{ marginLeft: 'auto', fontSize: 9, color: '#C9A96E', fontWeight: 500 }}>✓</span>
                  )}
                </div>
              ))}
            </div>

          </div>
        </main>

        {/* ── FEATURE CARDS ───────────────────────────── */}
        <section className="pb-14 lg:pb-18">
          <div style={{
            borderTop: '1px solid rgba(32,54,74,.12)',
            paddingTop: 44,
            marginBottom: 32,
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
          }}>
            <div style={{ fontFamily: 'Forum, serif', fontSize: 'clamp(18px, 2.3vw, 26px)', color: '#20364A' }}>
              Возможности платформы
            </div>
            <div style={{ fontSize: 10, color: '#8A9BAA', letterSpacing: '.06em', textTransform: 'uppercase' }}>
              Всё необходимое — в одном месте
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {CARDS.map((c) => (
              <div key={c.num} style={{
                background: '#fff',
                border: '1px solid rgba(32,54,74,.08)',
                borderRadius: 16,
                padding: '22px 20px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Watermark */}
                <div style={{
                  position: 'absolute', top: 12, right: 16,
                  fontFamily: 'Forum, serif', fontSize: 44,
                  color: 'rgba(32,54,74,.04)', lineHeight: 1, userSelect: 'none',
                }}>{c.num}</div>

                {/* Icon */}
                <div style={{
                  width: 42, height: 42, borderRadius: 11,
                  background: 'rgba(32,54,74,.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 14, color: '#20364A',
                }}>
                  {c.icon}
                </div>

                <div style={{ fontSize: 13, fontWeight: 600, color: '#20364A', marginBottom: 7, letterSpacing: '.01em' }}>
                  {c.title}
                </div>
                <div style={{ fontSize: 11, lineHeight: 1.7, color: 'rgba(32,54,74,.52)' }}>
                  {c.desc}
                </div>

                {/* Gold bottom accent */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 20,
                  width: 24, height: 2, borderRadius: 1,
                  background: 'linear-gradient(90deg, #C9A96E, rgba(201,169,110,.25))',
                }} />
              </div>
            ))}
          </div>
        </section>

        {/* ── FOOTER ──────────────────────────────────── */}
        <footer style={{
          borderTop: '1px solid rgba(32,54,74,.1)',
          paddingTop: 18, paddingBottom: 26,
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ fontSize: 10, color: 'rgba(32,54,74,.32)', letterSpacing: '.05em' }}>
            © 2025 T&D Aesthetic Medicine Clinic. Все права защищены.
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {[1, 0.55, 0.25].map((o, i) => (
              <div key={i} style={{ width: 32, height: 1, background: `rgba(32,54,74,${o * 0.16})` }} />
            ))}
          </div>
        </footer>

      </div>
    </div>
  )
}
