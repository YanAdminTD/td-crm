'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile, Service, ServiceCategory } from '@/types'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор', kc1: 'КЦ-1', kc2: 'КЦ-2',
  finance: 'Финансист', lawyer: 'Юрист', reception: 'Рецепшен', doctor: 'Врач',
}

const ACCESS_MATRIX = [
  ['Воронка КЦ-1',         '✓','✓','—','✓','—','✓','—'],
  ['База КЦ-2',            '✓','—','✓','✓','✓','✓','—'],
  ['Перевод КЦ-1 → КЦ-2', '✓','—','—','✓','—','—','—'],
  ['Корзина абонемента',   '✓','—','—','✓','—','—','—'],
  ['Рецепшен',             '✓','—','—','—','—','✓','—'],
  ['Отметить процедуру',   '✓','—','—','—','—','—','✓'],
  ['Карточка клиента',     '✓','—','✓','✓','✓','—','—'],
  ['Примечание возврата',  '✓','—','—','—','✓','—','—'],
  ['Решение по возврату',  '✓','—','—','—','—','—','—'],
  ['Дашборд / Аналитика', '✓','—','—','—','—','—','—'],
  ['Скачать базу',         '✓','—','—','—','—','—','—'],
  ['Управление ролями',    '✓','—','—','—','—','—','—'],
]

const EMPTY_STAFF = { full_name: '', email: '', phone: '', role: 'kc1', temporary_password: '' }
const EMPTY_SVC   = { name: '', category_id: '', description: '', price: '', duration_minutes: '' }

/* ── small shared style helpers ── */
const sLabel: React.CSSProperties = {
  display: 'block', fontSize: 9, fontWeight: 700, color: '#8A9BB0',
  letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 4,
}
const sCard: React.CSSProperties = {
  background: '#fff', border: '1px solid #DDD8D0',
  borderRadius: 14, overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(32,54,74,.06)',
}
const sBtn = (primary = false): React.CSSProperties => ({
  padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500,
  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
  background: primary ? '#C45C3C' : '#F5F2EE',
  color: primary ? '#fff' : '#20364A',
})

export default function AdminPage() {
  const { role, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState(0)

  /* ── Staff ── */
  const [staff, setStaff]                 = useState<Profile[]>([])
  const [staffLoading, setStaffLoading]   = useState(true)
  const [showStaffForm, setShowStaffForm] = useState(false)
  const [staffForm, setStaffForm]         = useState(EMPTY_STAFF)
  const [staffSubmitting, setStaffSubmitting] = useState(false)
  const [staffError, setStaffError]       = useState('')
  const [staffSuccess, setStaffSuccess]   = useState('')
  const [showPwd, setShowPwd]             = useState(false)

  /* ── Services ── */
  const [services, setServices]           = useState<Service[]>([])
  const [categories, setCategories]       = useState<ServiceCategory[]>([])
  const [svcLoading, setSvcLoading]       = useState(true)
  const [showSvcForm, setShowSvcForm]     = useState(false)
  const [svcForm, setSvcForm]             = useState(EMPTY_SVC)
  const [svcSubmitting, setSvcSubmitting] = useState(false)
  const [svcError, setSvcError]           = useState('')

  /* auth guard */
  useEffect(() => {
    if (!loading && role !== 'admin') router.replace('/dashboard')
  }, [role, loading, router])

  /* ── load staff ── */
  const loadStaff = useCallback(async () => {
    setStaffLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setStaff(data as Profile[])
    setStaffLoading(false)
  }, [supabase])

  /* ── load services + categories ── */
  const loadServices = useCallback(async () => {
    setSvcLoading(true)
    const [svcRes, catRes] = await Promise.all([
      supabase.from('services').select('*, service_categories(id, name)').eq('is_active', true).order('name'),
      supabase.from('service_categories').select('*').eq('is_active', true).order('name'),
    ])
    if (!svcRes.error && svcRes.data) setServices(svcRes.data as Service[])
    if (!catRes.error && catRes.data) setCategories(catRes.data as ServiceCategory[])
    setSvcLoading(false)
  }, [supabase])

  useEffect(() => { loadStaff() }, [loadStaff])
  useEffect(() => { loadServices() }, [loadServices])

  if (loading || role !== 'admin') return null

  /* ── staff form helpers ── */
  const setSF = (k: string, v: string) => setStaffForm(p => ({ ...p, [k]: v }))

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStaffError(''); setStaffSuccess('')
    if (!staffForm.full_name.trim())              { setStaffError('Введите имя.'); return }
    if (!staffForm.email.includes('@'))           { setStaffError('Некорректный email.'); return }
    if (staffForm.temporary_password.length < 8) { setStaffError('Пароль минимум 8 символов.'); return }
    setStaffSubmitting(true)
    try {
      const res  = await fetch('/api/admin/create-employee', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffForm),
      })
      const data = await res.json()
      if (!res.ok) { setStaffError(data.error ?? 'Ошибка.'); setStaffSubmitting(false); return }
      setStaffSuccess(`✓ Сотрудник ${staffForm.full_name.trim()} создан.`)
      setStaffForm(EMPTY_STAFF)
      setShowStaffForm(false)
      await loadStaff()
    } catch { setStaffError('Ошибка соединения.') }
    setStaffSubmitting(false)
  }

  /* ── service form helpers ── */
  const setSV = (k: string, v: string) => setSvcForm(p => ({ ...p, [k]: v }))

  const handleSvcSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSvcError('')
    if (!svcForm.name.trim())  { setSvcError('Введите название услуги.'); return }
    if (!svcForm.price)        { setSvcError('Введите цену.'); return }
    const price    = parseInt(svcForm.price)
    const duration = svcForm.duration_minutes ? parseInt(svcForm.duration_minutes) : null
    if (isNaN(price) || price <= 0) { setSvcError('Цена должна быть числом больше 0.'); return }
    setSvcSubmitting(true)
    const { data, error } = await supabase.from('services').insert({
      name:             svcForm.name.trim(),
      category_id:      svcForm.category_id || null,
      description:      svcForm.description.trim() || null,
      price,
      duration_minutes: duration,
      is_active:        true,
      created_at:       new Date().toISOString(),
    }).select().single()
    if (error) {
      setSvcError(error.message)
      setSvcSubmitting(false)
      return
    }
    if (data) setServices(prev => [data as Service, ...prev])
    setSvcForm(EMPTY_SVC)
    setShowSvcForm(false)
    setSvcSubmitting(false)
  }

  const deactivateSvc = async (id: string) => {
    if (!confirm('Деактивировать услугу?')) return
    await supabase.from('services').update({ is_active: false }).eq('id', id)
    setServices(prev => prev.filter(s => s.id !== id))
  }

  const updateRole = async (id: string, newRole: string) => {
    await supabase.from('profiles').update({ role: newRole, updated_at: new Date().toISOString() }).eq('id', id)
    setStaff(prev => prev.map(p => p.id === id ? { ...p, role: newRole as Profile['role'] } : p))
  }

  const toggleActive = async (id: string, cur: boolean) => {
    await supabase.from('profiles').update({ is_active: !cur, updated_at: new Date().toISOString() }).eq('id', id)
    setStaff(prev => prev.map(p => p.id === id ? { ...p, is_active: !cur } : p))
  }

  const TABS = ['Сотрудники', 'Услуги', 'Матрица прав']

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #DDD8D0', marginBottom: 16 }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            padding: '8px 18px', fontSize: 12, fontWeight: 500,
            cursor: 'pointer', background: 'none', border: 'none',
            borderBottom: `2px solid ${tab === i ? '#C45C3C' : 'transparent'}`,
            marginBottom: -1, color: tab === i ? '#C45C3C' : '#8A9BB0',
            fontFamily: 'inherit', letterSpacing: '.01em',
          }}>{t}</button>
        ))}
      </div>

      {/* ════ TAB 0: Staff ════════════════════════════ */}
      {tab === 0 && (
        <div>
          {staffSuccess && (
            <div style={{ marginBottom: 12, padding: '9px 14px', borderRadius: 9, background: '#E8F4EE', border: '1px solid #9FD4B8', color: '#3D7A5C', fontSize: 11, display: 'flex', alignItems: 'center', gap: 8 }}>
              {staffSuccess}
              <button onClick={() => setStaffSuccess('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#3D7A5C', fontSize: 14 }}>×</button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button style={sBtn(true)} onClick={() => { setShowStaffForm(true); setStaffError('') }}>
              + Добавить сотрудника
            </button>
          </div>

          {/* staff form */}
          {showStaffForm && (
            <div style={{ ...sCard, padding: 20, marginBottom: 16, maxWidth: 580 }}>
              <div style={{ fontFamily: 'Forum, serif', fontSize: 18, color: '#20364A', marginBottom: 14 }}>Новый сотрудник</div>
              {staffError && (
                <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: '#FAEAEA', border: '1px solid #F0C0C0', color: '#B84040', fontSize: 11 }}>
                  {staffError}
                </div>
              )}
              <form onSubmit={handleStaffSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
                  <div><label style={sLabel}>Имя Фамилия *</label><input className="td-input" value={staffForm.full_name} onChange={e => setSF('full_name', e.target.value)} placeholder="Алия Касымова" required disabled={staffSubmitting}/></div>
                  <div><label style={sLabel}>Email *</label><input className="td-input" type="email" value={staffForm.email} onChange={e => setSF('email', e.target.value)} placeholder="aliya@td-clinic.kz" required disabled={staffSubmitting}/></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
                  <div><label style={sLabel}>Роль *</label>
                    <select className="td-input" value={staffForm.role} onChange={e => setSF('role', e.target.value)} disabled={staffSubmitting}>
                      {Object.entries(ROLE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div><label style={sLabel}>Телефон</label><input className="td-input" type="tel" value={staffForm.phone} onChange={e => setSF('phone', e.target.value)} placeholder="+7 700 000 00 00" disabled={staffSubmitting}/></div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={sLabel}>Временный пароль * (мин. 8 символов)</label>
                  <div style={{ position: 'relative' }}>
                    <input className="td-input" type={showPwd ? 'text' : 'password'} value={staffForm.temporary_password}
                      onChange={e => setSF('temporary_password', e.target.value)} placeholder="Минимум 8 символов"
                      required minLength={8} disabled={staffSubmitting} style={{ paddingRight: 38 }}/>
                    <button type="button" onClick={() => setShowPwd(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8A9BB0' }}>
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                        <path d="M1 7.5C2.5 4 4.8 2 7.5 2s5 2 6.5 5.5c-1.5 3.5-3.8 5.5-6.5 5.5S2.5 11 1 7.5z"/>
                        <circle cx="7.5" cy="7.5" r="2"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #EDE8E1', paddingTop: 12 }}>
                  <button type="button" style={sBtn()} onClick={() => { setShowStaffForm(false); setStaffError('') }} disabled={staffSubmitting}>Отмена</button>
                  <button type="submit" style={{ ...sBtn(true), opacity: staffSubmitting ? .65 : 1, cursor: staffSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
                    {staffSubmitting && <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ animation: 'spin 1s linear infinite' }}><circle cx="6.5" cy="6.5" r="5.5" stroke="rgba(255,255,255,.4)" strokeWidth="1.5"/><path d="M6.5 1A5.5 5.5 0 0 1 12 6.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                    {staffSubmitting ? 'Создание...' : 'Создать сотрудника'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* staff table */}
          {staffLoading ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#8A9BB0', fontSize: 12 }}>Загрузка...</div>
          ) : (
            <div style={sCard}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#F5F2EE' }}>
                    {['Имя','Роль','Email','Телефон','Статус','Изменить роль'].map(h => (
                      <th key={h} style={{ fontWeight: 600, color: '#8A9BB0', textAlign: 'left', padding: '8px 12px', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', borderBottom: '1px solid #EDE8E1', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staff.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 28, color: '#8A9BB0', fontSize: 12 }}>Нет сотрудников</td></tr>
                  ) : staff.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #EDE8E1' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#20364A', color: '#ECE7E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                            {(u.full_name ?? '?')[0].toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 500 }}>{u.full_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#F5F2EE', color: '#4A5568', border: '1px solid #DDD8D0' }}>{ROLE_LABELS[u.role] ?? u.role}</span></td>
                      <td style={{ padding: '10px 12px', color: '#4A5568', fontSize: 11 }}>{u.email ?? '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#4A5568', fontSize: 11 }}>{u.phone ?? '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <button
                          onClick={() => toggleActive(u.id, u.is_active)}
                          style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: u.is_active ? '#E8F4EE' : '#FAEAEA', color: u.is_active ? '#3D7A5C' : '#B84040' }}
                          title="Нажмите чтобы изменить">
                          {u.is_active ? 'Активен' : 'Неактивен'}
                        </button>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <select value={u.role} onChange={e => updateRole(u.id, e.target.value)}
                          style={{ fontSize: 10, padding: '3px 6px', borderRadius: 6, border: '1px solid #DDD8D0', background: '#F5F2EE', fontFamily: 'inherit', color: '#20364A', cursor: 'pointer' }}>
                          {Object.entries(ROLE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════ TAB 1: Services ═════════════════════════ */}
      {tab === 1 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button style={sBtn(true)} onClick={() => { setShowSvcForm(true); setSvcError('') }}>
              + Добавить услугу
            </button>
          </div>

          {/* service form */}
          {showSvcForm && (
            <div style={{ ...sCard, padding: 20, marginBottom: 16, maxWidth: 560 }}>
              <div style={{ fontFamily: 'Forum, serif', fontSize: 18, color: '#20364A', marginBottom: 14 }}>Новая услуга</div>
              {svcError && (
                <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: '#FAEAEA', border: '1px solid #F0C0C0', color: '#B84040', fontSize: 11 }}>
                  {svcError}
                </div>
              )}
              <form onSubmit={handleSvcSubmit}>
                <div style={{ marginBottom: 10 }}>
                  <label style={sLabel}>Название услуги *</label>
                  <input className="td-input" value={svcForm.name} onChange={e => setSV('name', e.target.value)} placeholder="Ботокс — лоб" required disabled={svcSubmitting}/>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
                  <div>
                    <label style={sLabel}>Категория</label>
                    <select className="td-input" value={svcForm.category_id} onChange={e => setSV('category_id', e.target.value)} disabled={svcSubmitting}>
                      <option value="">— Без категории —</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {categories.length === 0 && (
                      <div style={{ fontSize: 9, color: '#8A9BB0', marginTop: 3 }}>
                        Нет категорий. Добавьте в таблицу service_categories в Supabase.
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={sLabel}>Цена (₸) *</label>
                    <input className="td-input" type="number" value={svcForm.price} onChange={e => setSV('price', e.target.value)} placeholder="45000" required disabled={svcSubmitting} min="0"/>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
                  <div>
                    <label style={sLabel}>Длительность (мин)</label>
                    <input className="td-input" type="number" value={svcForm.duration_minutes} onChange={e => setSV('duration_minutes', e.target.value)} placeholder="60" disabled={svcSubmitting} min="0"/>
                  </div>
                  <div>
                    <label style={sLabel}>Описание</label>
                    <input className="td-input" value={svcForm.description} onChange={e => setSV('description', e.target.value)} placeholder="Краткое описание" disabled={svcSubmitting}/>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #EDE8E1', paddingTop: 12 }}>
                  <button type="button" style={sBtn()} onClick={() => { setShowSvcForm(false); setSvcError('') }} disabled={svcSubmitting}>Отмена</button>
                  <button type="submit" style={{ ...sBtn(true), opacity: svcSubmitting ? .65 : 1, cursor: svcSubmitting ? 'not-allowed' : 'pointer' }}>
                    {svcSubmitting ? 'Сохранение...' : 'Добавить услугу'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* services table */}
          {svcLoading ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#8A9BB0', fontSize: 12 }}>Загрузка...</div>
          ) : (
            <div style={sCard}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#F5F2EE' }}>
                    {['Название','Категория','Цена','Длит. (мин)','Действие'].map(h => (
                      <th key={h} style={{ fontWeight: 600, color: '#8A9BB0', textAlign: 'left', padding: '8px 12px', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', borderBottom: '1px solid #EDE8E1', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {services.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28, color: '#8A9BB0', fontSize: 12 }}>
                      Нет услуг. Нажмите «+ Добавить услугу».
                    </td></tr>
                  ) : services.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #EDE8E1' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>{s.name}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#F5F2EE', color: '#4A5568', border: '1px solid #DDD8D0' }}>
                          {(s as any).service_categories?.name ?? '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#20364A' }}>{s.price.toLocaleString('ru')} ₸</td>
                      <td style={{ padding: '10px 12px', color: '#4A5568', fontSize: 11 }}>{s.duration_minutes ?? '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <button onClick={() => deactivateSvc(s.id)} style={{ fontSize: 10, padding: '3px 9px', borderRadius: 6, border: '1px solid #F0C0C0', background: '#FAEAEA', color: '#B84040', cursor: 'pointer', fontFamily: 'inherit' }}>
                          Убрать
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════ TAB 2: Access matrix ════════════════════ */}
      {tab === 2 && (
        <div style={{ ...sCard, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#20364A', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
            Матрица доступа по ролям
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 520 }}>
              <thead>
                <tr style={{ background: '#F5F2EE' }}>
                  <th style={{ fontWeight: 600, color: '#8A9BB0', textAlign: 'left', padding: '7px 12px', fontSize: 9, letterSpacing: '.06em', textTransform: 'uppercase', borderBottom: '1px solid #EDE8E1' }}>Действие</th>
                  {['Адм','КЦ-1','КЦ-2','Фин','Юрист','Реп','Врач'].map(h => (
                    <th key={h} style={{ fontWeight: 600, color: '#8A9BB0', textAlign: 'center', padding: '7px 8px', fontSize: 9, letterSpacing: '.06em', textTransform: 'uppercase', borderBottom: '1px solid #EDE8E1' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ACCESS_MATRIX.map(([row, ...cols]) => (
                  <tr key={row} style={{ borderBottom: '1px solid #EDE8E1' }}>
                    <td style={{ padding: '7px 12px', fontSize: 11 }}>{row}</td>
                    {cols.map((v, i) => (
                      <td key={i} style={{ textAlign: 'center', fontSize: 12, padding: '7px 8px', color: v !== '—' ? '#3D7A5C' : '#C0C0C0', fontWeight: v !== '—' ? 600 : 400 }}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
