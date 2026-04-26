'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Client } from '@/types'

/* ─────────────────────────────────────────────────────────
   KC-1 — Воронка лидов
   Суть изменений:
   1. Фильтр по дате — опционален, по умолчанию показываем ВСЕ лиды
      (без фильтра), сортируя по created_at desc.
      Это устраняет баг "лид исчезает из-за timezone".
   2. Поле email убрано.
   3. Добавлено поле visit_at (дата и время визита).
   4. status = "new_lead" (правильный enum Supabase).
   5. После создания — полный refetch.
   ───────────────────────────────────────────────────────── */

const STATUS_LABEL: Record<string, string> = {
  new_lead: 'Новый',
  in_progress: 'Связались',
  sold: 'Продан',
  active_client: 'Клиент',
  lost: 'Отказ',
  refund_requested: 'Запрос возврата',
  refunded: 'Возврат',
}

const STATUS_PILL: Record<string, string> = {
  new_lead: 'p-new',
  in_progress: 'p-contact',
  sold: 'p-paid',
  active_client: 'p-done',
  lost: 'p-fail',
  refund_requested: 'p-consult',
  refunded: 'p-fail',
}

const KC1_STATUSES = ['new_lead', 'in_progress', 'lost']
const SOURCE_OPTIONS = ['Instagram','WhatsApp','2GIS','Сайт','Звонок','Рекомендация']

// расширенный Client с visit_at
interface ClientWithVisit extends Client {
  visit_at?: string | null
}

interface LeadForm {
  full_name: string
  phone:     string
  source:    string
  comment:   string
  visit_at:  string   // datetime-local value: "2025-06-14T15:00"
}
const EMPTY_FORM: LeadForm = {
  full_name: '',
  phone:     '',
  source:    'Instagram',
  comment:   '',
  visit_at:  '',
}

/* ── helpers ─────────────────────────────────────────────── */
function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ru', {
    day:    '2-digit',
    month:  '2-digit',
    year:   '2-digit',
    hour:   '2-digit',
    minute: '2-digit',
  })
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('ru', {
    day:    '2-digit',
    month:  '2-digit',
    year:   '2-digit',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

/* ── styles ──────────────────────────────────────────────── */
const S = {
  label: {
    display: 'block' as const,
    fontSize: 9, fontWeight: 700 as const,
    color: '#8A9BB0', letterSpacing: '.07em',
    textTransform: 'uppercase' as const, marginBottom: 4,
  },
  input: {
    width: '100%', padding: '8px 11px', borderRadius: 8,
    border: '1px solid #DDD8D0', background: '#F5F2EE',
    fontSize: 12, color: '#20364A', fontFamily: 'inherit', outline: 'none',
  } as React.CSSProperties,
  tableCard: {
    background: '#fff', border: '1px solid #DDD8D0',
    borderRadius: 14, overflow: 'hidden' as const,
    boxShadow: '0 2px 8px rgba(32,54,74,.06)',
  },
  th: {
    fontWeight: 700, color: '#8A9BB0', textAlign: 'left' as const,
    padding: '9px 14px', fontSize: 9,
    letterSpacing: '.07em', textTransform: 'uppercase' as const,
    borderBottom: '1px solid #EDE8E1', whiteSpace: 'nowrap' as const,
    background: '#F5F2EE',
  },
  td: { padding: '11px 14px', borderBottom: '1px solid #F5F2EE' },
}

export default function KC1Page() {
  const { profile, role } = useAuth()
  const supabase = createClient()

  const isAdmin = role === 'admin'
  const canEdit = role === 'admin' || role === 'kc1'

  /* ── data ────────────────────────────────────────────── */
  const [clients,    setClients]    = useState<ClientWithVisit[]>([])
  const [selectedClient, setSelectedClient] = useState<ClientWithVisit | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [fetchErr,   setFetchErr]   = useState('')

  /* ── form ────────────────────────────────────────────── */
  const [showForm,   setShowForm]   = useState(false)
  const [form,       setForm]       = useState<LeadForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError,  setFormError]  = useState('')

  /* ── fetch — БЕЗ фильтра по дате ────────────────────────
     Показываем все KC-1 лиды, сортируем по created_at desc.
     Это исключает баг с таймзоной — лид никогда не "исчезнет".
  ──────────────────────────────────────────────────────────── */
  const fetchClients = useCallback(async () => {
    setLoading(true)
    setFetchErr('')

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .in('status', KC1_STATUSES)
      .order('created_at', { ascending: false })

    if (error) { setFetchErr(error.message); setLoading(false); return }
    setClients((data ?? []) as ClientWithVisit[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchClients() }, [fetchClients])

  /* ── update status ─────────────────────────────────────── */
  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('clients')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) {
      setClients(prev =>
        prev.map(c => c.id === id ? { ...c, status: status as Client['status'] } : c)
      )
    }
  }

  /* ── create lead ─────────────────────────────────────────
     Поля: full_name, phone, source, comment, status, visit_at
     НЕТ поля email.
     После сохранения — fetchClients() для 100% актуального списка.
  ──────────────────────────────────────────────────────────── */
  const setF = (k: keyof LeadForm, v: string) =>
    setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!form.full_name.trim()) { setFormError('Введите имя клиента.'); return }
    if (!form.phone.trim())     { setFormError('Введите телефон.'); return }

    setSubmitting(true)

    const now = new Date().toISOString()

    // Конвертируем datetime-local → ISO (если заполнено)
    const visitISO = form.visit_at
      ? new Date(form.visit_at).toISOString()
      : null

    const { error } = await supabase
      .from('clients')
      .insert({
        full_name:          form.full_name.trim(),
        phone:              form.phone.trim(),
        source:             form.source         || null,
        comment:            form.comment.trim() || null,
        status:             'new_lead',          // ← правильный enum
        visit_at:           visitISO,
        responsible_kc1_id: profile?.id ?? null,
        created_at:         now,
        updated_at:         now,
      })

    if (error) {
      setFormError(error.message)
      setSubmitting(false)
      return
    }

    // Сброс формы
    setForm(EMPTY_FORM)
    setShowForm(false)
    setSubmitting(false)

    // Полный refetch — лид появится в списке гарантированно
    await fetchClients()
  }

  /* ────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────────── */
  return (
    <div>

      {/* info bar */}
      <div style={{
        background: '#ECE7E2', borderRadius: 8, padding: '8px 13px',
        fontSize: 11, color: '#4A5568', marginBottom: 14,
        borderLeft: '3px solid #C45C3C', lineHeight: 1.6,
      }}>
        КЦ-1 — первичные лиды. Перевод клиента в КЦ-2 выполняет финансист после оформления абонемента.
      </div>

      {/* ── TOP BAR ────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14, gap: 10, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: '#4A5568' }}>
            Всего лидов: <strong style={{ color: '#20364A' }}>{clients.length}</strong>
          </span>
          <button
            onClick={fetchClients}
            style={{
              padding: '6px 13px', borderRadius: 8,
              background: '#F5F2EE', color: '#20364A',
              border: '1px solid #DDD8D0', fontSize: 11,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Обновить
          </button>
        </div>

        {canEdit && (
          <button
            onClick={() => { setShowForm(s => !s); setFormError('') }}
            style={{
              padding: '8px 18px', borderRadius: 8,
              background: '#C45C3C', color: '#fff', border: 'none',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 3px 10px rgba(196,92,60,.25)',
            }}
          >
            {showForm ? '✕ Закрыть форму' : '+ Новый лид'}
          </button>
        )}
      </div>

      {/* ── CREATE FORM ─────────────────────────────── */}
      {showForm && (
        <div style={{
          background: '#fff', border: '1px solid #DDD8D0', borderRadius: 14,
          padding: 22, marginBottom: 16, maxWidth: 560,
          boxShadow: '0 4px 20px rgba(32,54,74,.09)',
        }}>
          <div style={{ fontFamily: 'Forum, serif', fontSize: 18, color: '#20364A', marginBottom: 16 }}>
            Новый лид
          </div>

          {formError && (
            <div style={{
              marginBottom: 12, padding: '8px 12px', borderRadius: 8,
              background: '#FAEAEA', border: '1px solid #F0C0C0',
              color: '#B84040', fontSize: 11,
            }}>
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* Имя */}
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Имя клиента *</label>
              <input
                style={S.input}
                value={form.full_name}
                onChange={e => setF('full_name', e.target.value)}
                placeholder="Алина Смирнова"
                disabled={submitting}
                required
              />
            </div>

            {/* Телефон + Источник */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={S.label}>Телефон *</label>
                <input
                  style={S.input}
                  type="tel"
                  value={form.phone}
                  onChange={e => setF('phone', e.target.value)}
                  placeholder="+7 700 000 00 00"
                  disabled={submitting}
                  required
                />
              </div>
              <div>
                <label style={S.label}>Источник</label>
                <select
                  style={S.input}
                  value={form.source}
                  onChange={e => setF('source', e.target.value)}
                  disabled={submitting}
                >
                  {SOURCE_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Дата и время визита */}
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Дата и время визита</label>
              <input
                style={S.input}
                type="datetime-local"
                value={form.visit_at}
                onChange={e => setF('visit_at', e.target.value)}
                disabled={submitting}
              />
              <div style={{ fontSize: 9, color: '#8A9BB0', marginTop: 3 }}>
                Необязательно. Запланированная дата визита клиента.
              </div>
            </div>

            {/* Комментарий */}
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Комментарий</label>
              <textarea
                style={{ ...S.input, resize: 'vertical' } as React.CSSProperties}
                rows={2}
                value={form.comment}
                onChange={e => setF('comment', e.target.value)}
                placeholder="Пожелания, откуда узнал(а)..."
                disabled={submitting}
              />
            </div>

            {/* Buttons */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 8,
              borderTop: '1px solid #EDE8E1', paddingTop: 14,
            }}>
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormError('') }}
                disabled={submitting}
                style={{
                  padding: '7px 16px', borderRadius: 8,
                  background: '#F5F2EE', color: '#20364A',
                  border: '1px solid #DDD8D0', fontSize: 12,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '7px 20px', borderRadius: 8,
                  background: submitting ? '#ccc' : '#C45C3C',
                  color: '#fff', border: 'none',
                  fontSize: 12, fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 7,
                }}
              >
                {submitting && (
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
                    style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="6.5" cy="6.5" r="5.5" stroke="rgba(255,255,255,.4)" strokeWidth="1.5"/>
                    <path d="M6.5 1A5.5 5.5 0 0 1 12 6.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
                {submitting ? 'Сохранение...' : 'Добавить лид'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* fetch error */}
      {fetchErr && (
        <div style={{
          marginBottom: 12, padding: '9px 13px', borderRadius: 9,
          background: '#FAEAEA', border: '1px solid #F0C0C0',
          color: '#B84040', fontSize: 11,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          Ошибка загрузки: {fetchErr}
          <button onClick={fetchClients} style={{ background: 'none', border: 'none', color: '#B84040', textDecoration: 'underline', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
            Повторить
          </button>
        </div>
      )}

      {/* ── TABLE ──────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0', color: '#8A9BB0', fontSize: 12 }}>
          Загрузка...
        </div>
      ) : (
        <div style={S.tableCard}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={S.th}>Клиент</th>
                <th style={S.th}>Телефон</th>
                <th style={S.th}>Источник</th>
                <th style={S.th}>Статус</th>
                {isAdmin && <th style={S.th}>Изменить</th>}
                <th style={S.th}>Дата визита</th>
                <th style={S.th}>Создан</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
                    style={{ textAlign: 'center', padding: 40, color: '#8A9BB0', fontSize: 12 }}
                  >
                    Лидов пока нет. Нажмите «+ Новый лид».
                  </td>
                </tr>
              ) : (
                clients.map(c => (
                  <tr
                      key={c.id}
                       style={{ cursor: 'pointer' }}
                       onClick={() => setSelectedClient(c)}
                    onMouseOver={e => (e.currentTarget.style.background = '#FAFAF8')}
                    onMouseOut={e  => (e.currentTarget.style.background = '')}
                  >

                    {/* Клиент */}
                    <td style={S.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: '#20364A', color: '#ECE7E2',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, flexShrink: 0,
                        }}>
                          {(c.full_name[0] ?? '?').toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#20364A' }}>{c.full_name}</div>
                          {c.comment && (
                            <div style={{ fontSize: 10, color: '#8A9BB0', marginTop: 1, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {c.comment}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Телефон */}
                    <td style={{ ...S.td, color: '#4A5568', fontSize: 11 }}>
                      {c.phone}
                    </td>

                    {/* Источник */}
                    <td style={S.td}>
                      {c.source
                        ? (
                          <span style={{
                            fontSize: 10, padding: '3px 9px', borderRadius: 20,
                            background: '#F5F2EE', color: '#4A5568',
                            border: '1px solid #DDD8D0',
                          }}>
                            {c.source}
                          </span>
                        )
                        : <span style={{ color: '#C0C0C0', fontSize: 11 }}>—</span>
                      }
                    </td>

                    {/* Статус */}
                    <td style={S.td}>
                      <span className={`pill ${STATUS_PILL[c.status] ?? 'p-new'}`}>
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
                    </td>

                    {/* Изменить статус (admin) */}
                    {isAdmin && (
                      <td style={S.td}>
                        <select
                          value={c.status}
                          onChange={e => updateStatus(c.id, e.target.value)}
                          style={{
                            fontSize: 10, padding: '3px 7px', borderRadius: 6,
                            border: '1px solid #DDD8D0', background: '#F5F2EE',
                            fontFamily: 'inherit', color: '#20364A', cursor: 'pointer',
                          }}
                        >
                          {KC1_STATUSES.map(s => (
                            <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
                          ))}
                        </select>
                      </td>
                    )}

                    {/* Дата визита */}
                    <td style={{ ...S.td, color: (c as ClientWithVisit).visit_at ? '#20364A' : '#C0C0C0', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {fmtDateTime((c as ClientWithVisit).visit_at)}
                    </td>

                    {/* Создан */}
                    <td style={{ ...S.td, color: '#8A9BB0', fontSize: 10, whiteSpace: 'nowrap' }}>
                      {fmtDate(c.created_at)}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}