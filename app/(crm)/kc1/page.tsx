'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Client } from '@/types'

/* ── helpers ─────────────────────────────────────────────── */
function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}
function todayStr() {
  return toDateStr(new Date())
}

const STATUS_LABEL: Record<string, string> = {
  new_lead:     'Новый',
  contacted:    'Связались',
  consultation: 'Консультация',
  booked:       'Записан',
  paid:         'Оплачен',
  declined:     'Отказ',
}
const STATUS_PILL: Record<string, string> = {
  new_lead:     'p-new',
  contacted:    'p-contact',
  consultation: 'p-consult',
  booked:       'p-done',
  paid:         'p-paid',
  declined:     'p-fail',
}
const KC1_STATUSES = ['new_lead','contacted','consultation','booked','paid','declined']
const SOURCE_OPTIONS = ['Instagram','WhatsApp','2GIS','Сайт','Звонок','Рекомендация']

type FilterMode = 'today' | 'date' | 'range'

interface LeadForm {
  full_name: string; phone: string; email: string
  source: string; comment: string
}
const EMPTY: LeadForm = { full_name: '', phone: '', email: '', source: 'Instagram', comment: '' }

/* ── shared mini-styles ──────────────────────────────────── */
const sLabel: React.CSSProperties = {
  display: 'block', fontSize: 9, fontWeight: 700, color: '#8A9BB0',
  letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 4,
}
const sInput: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid #DDD8D0', background: '#F5F2EE',
  fontSize: 12, color: '#20364A', fontFamily: 'inherit', outline: 'none',
}
const sCard: React.CSSProperties = {
  background: '#fff', border: '1px solid #DDD8D0',
  borderRadius: 14, overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(32,54,74,.06)',
}

export default function KC1Page() {
  const { profile, role } = useAuth()
  const supabase = createClient()

  /* filter state */
  const [filterMode, setFilterMode] = useState<FilterMode>('today')
  const [singleDate, setSingleDate] = useState(todayStr())
  const [rangeFrom,  setRangeFrom]  = useState(todayStr())
  const [rangeTo,    setRangeTo]    = useState(todayStr())

  /* data */
  const [clients,    setClients]    = useState<Client[]>([])
  const [loading,    setLoading]    = useState(true)

  /* form */
  const [showForm,    setShowForm]    = useState(false)
  const [form,        setForm]        = useState<LeadForm>(EMPTY)
  const [submitting,  setSubmitting]  = useState(false)
  const [formError,   setFormError]   = useState('')

  const isAdmin = role === 'admin'
  const canEdit = role === 'admin' || role === 'kc1'

  /* ── fetch with date filters ─────────────────────────── */
  const fetchClients = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('clients')
      .select('*')
      .in('status', KC1_STATUSES)
      .order('created_at', { ascending: false })

    if (filterMode === 'today') {
      const t = todayStr()
      query = query.gte('created_at', `${t}T00:00:00`).lte('created_at', `${t}T23:59:59`)
    } else if (filterMode === 'date') {
      query = query.gte('created_at', `${singleDate}T00:00:00`).lte('created_at', `${singleDate}T23:59:59`)
    } else {
      query = query.gte('created_at', `${rangeFrom}T00:00:00`).lte('created_at', `${rangeTo}T23:59:59`)
    }

    const { data, error } = await query
    if (!error) setClients((data ?? []) as Client[])
    setLoading(false)
  }, [supabase, filterMode, singleDate, rangeFrom, rangeTo])

  useEffect(() => { fetchClients() }, [fetchClients])

  /* ── update status ─────────────────────────────────────── */
  const updateStatus = async (id: string, status: string) => {
    await supabase
      .from('clients')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    setClients(prev => prev.map(c => c.id === id ? { ...c, status: status as Client['status'] } : c))
  }

  /* ── create lead ───────────────────────────────────────── */
  const set = (k: keyof LeadForm, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!form.full_name.trim()) { setFormError('Введите имя клиента.'); return }
    if (!form.phone.trim())     { setFormError('Введите телефон.'); return }

    setSubmitting(true)
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('clients')
      .insert({
        full_name:          form.full_name.trim(),
        phone:              form.phone.trim(),
        email:              form.email.trim() || null,
        source:             form.source || null,
        comment:            form.comment.trim() || null,
        status:             'new_lead',   // correct enum value
        responsible_kc1_id: profile?.id ?? null,
        created_at:         now,
        updated_at:         now,
      })
      .select()
      .single()

    if (error) { setFormError(error.message); setSubmitting(false); return }

    // Optimistic: prepend to list if today filter active (or matching date)
    if (data) {
      const today = todayStr()
      const newDate = toDateStr(new Date(data.created_at))
      const visible =
        filterMode === 'today'   ? newDate === today :
        filterMode === 'date'    ? newDate === singleDate :
        newDate >= rangeFrom && newDate <= rangeTo
      if (visible) setClients(prev => [data as Client, ...prev])
    }

    setForm(EMPTY)
    setShowForm(false)
    setSubmitting(false)
  }

  /* ── filter pill ─────────────────────────────────────── */
  const FilterPill = ({ mode, label }: { mode: FilterMode; label: string }) => (
    <button
      onClick={() => setFilterMode(mode)}
      style={{
        padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 500,
        border: `1px solid ${filterMode === mode ? '#C45C3C' : '#DDD8D0'}`,
        background: filterMode === mode ? '#C45C3C' : '#fff',
        color: filterMode === mode ? '#fff' : '#8A9BB0',
        cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
      }}
    >{label}</button>
  )

  return (
    <div>
      {/* ── info bar ─────────────────────────────── */}
      <div style={{
        background: '#ECE7E2', borderRadius: 8, padding: '8px 13px',
        fontSize: 11, color: '#4A5568', marginBottom: 14,
        borderLeft: '3px solid #C45C3C', lineHeight: 1.6,
      }}>
        КЦ-1 — первичные лиды. Перевод в КЦ-2 выполняет финансист после оформления абонемента.
      </div>

      {/* ── FILTER BAR ───────────────────────────── */}
      <div style={{
        background: '#fff', border: '1px solid #DDD8D0', borderRadius: 12,
        padding: '12px 16px', marginBottom: 14,
        boxShadow: '0 1px 4px rgba(32,54,74,.05)',
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#8A9BB0', letterSpacing: '.07em', textTransform: 'uppercase', marginRight: 4 }}>
          Период:
        </span>

        <FilterPill mode="today" label="Сегодня" />
        <FilterPill mode="date"  label="Дата"    />
        <FilterPill mode="range" label="Диапазон"/>

        {/* date picker */}
        {filterMode === 'date' && (
          <input
            type="date" value={singleDate}
            onChange={e => setSingleDate(e.target.value)}
            style={{ padding: '5px 9px', borderRadius: 7, border: '1px solid #DDD8D0', fontSize: 11, fontFamily: 'inherit', background: '#F5F2EE', color: '#20364A', outline: 'none' }}
          />
        )}

        {/* range picker */}
        {filterMode === 'range' && (
          <>
            <input
              type="date" value={rangeFrom}
              onChange={e => setRangeFrom(e.target.value)}
              style={{ padding: '5px 9px', borderRadius: 7, border: '1px solid #DDD8D0', fontSize: 11, fontFamily: 'inherit', background: '#F5F2EE', color: '#20364A', outline: 'none' }}
            />
            <span style={{ fontSize: 11, color: '#8A9BB0' }}>—</span>
            <input
              type="date" value={rangeTo}
              onChange={e => setRangeTo(e.target.value)}
              style={{ padding: '5px 9px', borderRadius: 7, border: '1px solid #DDD8D0', fontSize: 11, fontFamily: 'inherit', background: '#F5F2EE', color: '#20364A', outline: 'none' }}
            />
          </>
        )}

        {/* refresh */}
        <button onClick={fetchClients} style={{
          padding: '6px 13px', borderRadius: 8,
          background: '#F5F2EE', color: '#20364A',
          border: '1px solid #DDD8D0', fontSize: 11, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Обновить
        </button>

        {/* count badge */}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#8A9BB0' }}>
          Найдено: <strong style={{ color: '#20364A' }}>{clients.length}</strong>
        </span>

        {/* add button */}
        {canEdit && (
          <button
            onClick={() => { setShowForm(true); setFormError('') }}
            style={{
              padding: '7px 16px', borderRadius: 8,
              background: '#C45C3C', color: '#fff', border: 'none',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            + Новый лид
          </button>
        )}
      </div>

      {/* ── CREATE FORM ──────────────────────────── */}
      {showForm && (
        <div style={{
          background: '#fff', border: '1px solid #DDD8D0', borderRadius: 14,
          padding: 20, marginBottom: 16, maxWidth: 560,
          boxShadow: '0 4px 16px rgba(32,54,74,.08)',
        }}>
          <div style={{ fontFamily: 'Forum, serif', fontSize: 18, color: '#20364A', marginBottom: 14 }}>
            Новый лид
          </div>
          {formError && (
            <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: '#FAEAEA', border: '1px solid #F0C0C0', color: '#B84040', fontSize: 11 }}>
              {formError}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
              <div>
                <label style={sLabel}>Имя клиента *</label>
                <input style={sInput} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Алина Смирнова" disabled={submitting} required/>
              </div>
              <div>
                <label style={sLabel}>Телефон *</label>
                <input style={sInput} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+7 700 000 00 00" disabled={submitting} required/>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
              <div>
                <label style={sLabel}>Email</label>
                <input style={sInput} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="client@mail.kz" disabled={submitting}/>
              </div>
              <div>
                <label style={sLabel}>Источник</label>
                <select style={sInput} value={form.source} onChange={e => set('source', e.target.value)} disabled={submitting}>
                  {SOURCE_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={sLabel}>Комментарий</label>
              <textarea style={{ ...sInput, resize: 'vertical' }} rows={2} value={form.comment} onChange={e => set('comment', e.target.value)} placeholder="Пожелания клиента..." disabled={submitting}/>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #EDE8E1', paddingTop: 12 }}>
              <button type="button" onClick={() => { setShowForm(false); setFormError('') }} disabled={submitting}
                style={{ padding: '7px 16px', borderRadius: 8, background: '#F5F2EE', color: '#20364A', border: '1px solid #DDD8D0', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                Отмена
              </button>
              <button type="submit" disabled={submitting}
                style={{ padding: '7px 18px', borderRadius: 8, background: submitting ? '#ccc' : '#C45C3C', color: '#fff', border: 'none', fontSize: 12, fontWeight: 500, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {submitting ? 'Сохранение...' : 'Добавить лид'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TABLE ────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0', color: '#8A9BB0', fontSize: 12 }}>Загрузка...</div>
      ) : (
        <div style={sCard}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F5F2EE' }}>
                {['Клиент', 'Телефон', 'Источник', 'Статус', isAdmin && 'Изменить', 'Дата создания'].filter(Boolean).map(h => (
                  <th key={h as string} style={{
                    fontWeight: 700, color: '#8A9BB0', textAlign: 'left',
                    padding: '9px 14px', fontSize: 9,
                    letterSpacing: '.07em', textTransform: 'uppercase',
                    borderBottom: '1px solid #EDE8E1', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: 36, color: '#8A9BB0', fontSize: 12 }}>
                    {filterMode === 'today'
                      ? 'Сегодня лидов пока нет. Нажмите «+ Новый лид».'
                      : 'Нет лидов за выбранный период.'}
                  </td>
                </tr>
              ) : clients.map(c => (
                <tr key={c.id}
                  style={{ borderBottom: '1px solid #F5F2EE' }}
                  onMouseOver={e => (e.currentTarget.style.background = '#FAFAF8')}
                  onMouseOut={e  => (e.currentTarget.style.background = '')}>

                  {/* name */}
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: '#20364A', color: '#ECE7E2',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, flexShrink: 0,
                      }}>
                        {c.full_name[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#20364A' }}>{c.full_name}</div>
                        {c.email && <div style={{ fontSize: 10, color: '#8A9BB0', marginTop: 1 }}>{c.email}</div>}
                      </div>
                    </div>
                  </td>

                  {/* phone */}
                  <td style={{ padding: '11px 14px', color: '#4A5568', fontSize: 11 }}>{c.phone}</td>

                  {/* source */}
                  <td style={{ padding: '11px 14px' }}>
                    {c.source
                      ? <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 20, background: '#F5F2EE', color: '#4A5568', border: '1px solid #DDD8D0' }}>{c.source}</span>
                      : <span style={{ color: '#C0C0C0', fontSize: 11 }}>—</span>
                    }
                  </td>

                  {/* status */}
                  <td style={{ padding: '11px 14px' }}>
                    <span className={`pill ${STATUS_PILL[c.status] ?? 'p-new'}`}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </td>

                  {/* change status (admin only) */}
                  {isAdmin && (
                    <td style={{ padding: '11px 14px' }}>
                      <select
                        value={c.status}
                        onChange={e => updateStatus(c.id, e.target.value)}
                        style={{ fontSize: 10, padding: '3px 7px', borderRadius: 6, border: '1px solid #DDD8D0', background: '#F5F2EE', fontFamily: 'inherit', color: '#20364A', cursor: 'pointer' }}
                      >
                        {KC1_STATUSES.map(s => (
                          <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
                        ))}
                      </select>
                    </td>
                  )}

                  {/* date */}
                  <td style={{ padding: '11px 14px', color: '#8A9BB0', fontSize: 10, whiteSpace: 'nowrap' }}>
                    {new Date(c.created_at).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
