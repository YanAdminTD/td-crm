'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

/* ─────────────────────────────────────────────────────────
   Doctors page — таблица specialists в Supabase
   Поля: id, full_name, phone, specialization, is_active, created_at

   НЕТ вызовов к API routes — только прямой Supabase insert/select.
   ───────────────────────────────────────────────────────── */

interface Specialist {
  id:             string
  full_name:      string
  phone?:         string
  specialization: string
  is_active:      boolean
  created_at:     string
  profile_id?:    string
}

interface SpecForm {
  full_name:      string
  phone:          string
  specialization: string
}
const EMPTY_FORM: SpecForm = { full_name: '', phone: '', specialization: '' }

const SPEC_OPTIONS = [
  'Инъекционист',
  'Лазерный специалист',
  'Дерматолог-косметолог',
  'Косметолог',
  'Мезотерапевт',
  'Трихолог',
  'Другое',
]

const S = {
  label: {
    display: 'block' as const,
    fontSize: 9, fontWeight: 700 as const, color: '#8A9BB0',
    letterSpacing: '.07em', textTransform: 'uppercase' as const, marginBottom: 4,
  },
  input: {
    width: '100%', padding: '8px 11px', borderRadius: 8,
    border: '1px solid #DDD8D0', background: '#F5F2EE',
    fontSize: 12, color: '#20364A', fontFamily: 'inherit', outline: 'none',
  } as React.CSSProperties,
  card: {
    background: '#fff', border: '1px solid #DDD8D0',
    borderRadius: 14, padding: '18px 20px', marginBottom: 14,
    boxShadow: '0 2px 8px rgba(32,54,74,.06)',
  } as React.CSSProperties,
}

export default function DoctorsPage() {
  const { role } = useAuth()
  const supabase = createClient()

  const isAdmin = role === 'admin'

  const [doctors,    setDoctors]    = useState<Specialist[]>([])
  const [loading,    setLoading]    = useState(true)
  const [fetchErr,   setFetchErr]   = useState('')

  const [showForm,   setShowForm]   = useState(false)
  const [form,       setForm]       = useState<SpecForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError,  setFormError]  = useState('')
  const [formOk,     setFormOk]     = useState('')

  /* ── load ─────────────────────────────────────────── */
  const loadDoctors = useCallback(async () => {
    setLoading(true)
    setFetchErr('')
    const { data, error } = await supabase
      .from('specialists')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) { setFetchErr(error.message); setLoading(false); return }
    setDoctors((data ?? []) as Specialist[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadDoctors() }, [loadDoctors])

  /* ── toggle is_active ────────────────────────────── */
  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from('specialists')
      .update({ is_active: !current })
      .eq('id', id)
    if (!error) {
      setDoctors(prev => prev.map(d => d.id === id ? { ...d, is_active: !current } : d))
    }
  }

  /* ── delete ──────────────────────────────────────── */
  const deleteDoctor = async (id: string) => {
    if (!confirm('Удалить специалиста?')) return
    const { error } = await supabase.from('specialists').delete().eq('id', id)
    if (!error) setDoctors(prev => prev.filter(d => d.id !== id))
  }

  /* ── create ──────────────────────────────────────────
     Прямой insert в specialists — без API route.
     Это устраняет ошибку 404.
  ──────────────────────────────────────────────────────── */
  const setF = (k: keyof SpecForm, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormOk('')

    if (!form.full_name.trim())      { setFormError('Введите имя специалиста.'); return }
    if (!form.specialization.trim()) { setFormError('Укажите специализацию.'); return }

    setSubmitting(true)

    const { data, error } = await supabase
      .from('specialists')
      .insert({
        full_name:      form.full_name.trim(),
        phone:          form.phone.trim() || null,
        specialization: form.specialization.trim(),
        is_active:      true,
        created_at:     new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      setFormError(error.message)
      setSubmitting(false)
      return
    }

    /* prepend to list immediately */
    if (data) setDoctors(prev => [data as Specialist, ...prev])

    setFormOk(`✓ Специалист ${form.full_name.trim()} добавлен.`)
    setForm(EMPTY_FORM)
    setShowForm(false)
    setSubmitting(false)
  }

  /* ─────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────── */
  return (
    <div>
      {/* info bar */}
      <div style={{
        background: '#ECE7E2', borderRadius: 8, padding: '8px 13px',
        fontSize: 11, color: '#4A5568', marginBottom: 14,
        borderLeft: '3px solid #C45C3C', lineHeight: 1.6,
      }}>
        Специалисты клиники. Данные загружаются из таблицы <code style={{ fontFamily: 'monospace', background: '#DDD8D0', padding: '1px 4px', borderRadius: 3 }}>specialists</code>.
      </div>

      {/* success banner */}
      {formOk && (
        <div style={{
          marginBottom: 12, padding: '9px 14px', borderRadius: 9,
          background: '#E8F4EE', border: '1px solid #9FD4B8', color: '#3D7A5C',
          fontSize: 11, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {formOk}
          <button onClick={() => setFormOk('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#3D7A5C', fontSize: 14 }}>×</button>
        </div>
      )}

      {/* action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: '#4A5568' }}>
          {loading ? 'Загрузка...' : `${doctors.filter(d => d.is_active).length} активных специалистов`}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={loadDoctors}
            style={{
              padding: '7px 14px', borderRadius: 8, background: '#F5F2EE',
              color: '#20364A', border: '1px solid #DDD8D0',
              fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Обновить
          </button>
          {isAdmin && (
            <button
              onClick={() => { setShowForm(true); setFormError(''); setFormOk('') }}
              style={{
                padding: '7px 16px', borderRadius: 8,
                background: '#C45C3C', color: '#fff', border: 'none',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              + Добавить специалиста
            </button>
          )}
        </div>
      </div>

      {/* ── fetch error ─────────────────────────────── */}
      {fetchErr && (
        <div style={{
          marginBottom: 14, padding: '9px 13px', borderRadius: 9,
          background: '#FAEAEA', border: '1px solid #F0C0C0', color: '#B84040', fontSize: 11,
        }}>
          Ошибка загрузки: {fetchErr}
        </div>
      )}

      {/* ── CREATE FORM ─────────────────────────────── */}
      {showForm && isAdmin && (
        <div style={{
          background: '#fff', border: '1px solid #DDD8D0', borderRadius: 14,
          padding: 20, marginBottom: 16, maxWidth: 520,
          boxShadow: '0 4px 16px rgba(32,54,74,.08)',
        }}>
          <div style={{ fontFamily: 'Forum, serif', fontSize: 18, color: '#20364A', marginBottom: 14 }}>
            Новый специалист
          </div>

          {formError && (
            <div style={{
              marginBottom: 12, padding: '8px 12px', borderRadius: 8,
              background: '#FAEAEA', border: '1px solid #F0C0C0', color: '#B84040', fontSize: 11,
            }}>
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 10 }}>
              <label style={S.label}>Имя Фамилия *</label>
              <input
                style={S.input} value={form.full_name}
                onChange={e => setF('full_name', e.target.value)}
                placeholder="Карина Алматова"
                disabled={submitting} required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
              <div>
                <label style={S.label}>Специализация *</label>
                <select
                  style={S.input} value={form.specialization}
                  onChange={e => setF('specialization', e.target.value)}
                  disabled={submitting}
                >
                  <option value="">— Выберите —</option>
                  {SPEC_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Телефон</label>
                <input
                  style={S.input} type="tel" value={form.phone}
                  onChange={e => setF('phone', e.target.value)}
                  placeholder="+7 700 000 00 00"
                  disabled={submitting}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #EDE8E1', paddingTop: 12 }}>
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormError('') }}
                disabled={submitting}
                style={{
                  padding: '7px 16px', borderRadius: 8, background: '#F5F2EE',
                  color: '#20364A', border: '1px solid #DDD8D0',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '7px 18px', borderRadius: 8,
                  background: submitting ? '#ccc' : '#C45C3C',
                  color: '#fff', border: 'none',
                  fontSize: 12, fontWeight: 500,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {submitting ? 'Сохранение...' : 'Добавить специалиста'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── DOCTORS LIST ───────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0', color: '#8A9BB0', fontSize: 12 }}>
          Загрузка...
        </div>
      ) : doctors.length === 0 && !fetchErr ? (
        <div style={{
          background: '#fff', border: '1px solid #DDD8D0', borderRadius: 14,
          padding: 40, textAlign: 'center', color: '#8A9BB0', fontSize: 12,
        }}>
          Специалистов пока нет. Нажмите «+ Добавить специалиста».
        </div>
      ) : (
        doctors.map(d => (
          <div key={d.id} style={S.card}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>

              {/* avatar */}
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: d.is_active ? '#20364A' : '#C0C0C0',
                color: '#ECE7E2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Forum, serif', fontSize: 16,
              }}>
                {(d.full_name ?? '?')[0].toUpperCase()}
              </div>

              {/* info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                  <div style={{ fontFamily: 'Forum, serif', fontSize: 15, color: '#20364A' }}>
                    {d.full_name}
                  </div>
                  <span style={{
                    fontSize: 10, padding: '2px 9px', borderRadius: 20,
                    background: d.is_active ? '#E8F4EE' : '#F5F2EE',
                    color: d.is_active ? '#3D7A5C' : '#8A9BB0',
                    border: `1px solid ${d.is_active ? '#9FD4B8' : '#DDD8D0'}`,
                    fontWeight: 600,
                  }}>
                    {d.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                </div>

                <div style={{ fontSize: 11, color: '#4A5568', marginBottom: 4 }}>
                  {d.specialization}
                </div>

                {d.phone && (
                  <div style={{ fontSize: 11, color: '#8A9BB0' }}>{d.phone}</div>
                )}

                <div style={{ fontSize: 9, color: '#8A9BB0', marginTop: 4 }}>
                  Добавлен: {new Date(d.created_at).toLocaleDateString('ru')}
                </div>
              </div>

              {/* admin actions */}
              {isAdmin && (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => toggleActive(d.id, d.is_active)}
                    style={{
                      padding: '5px 13px', borderRadius: 7, fontSize: 11,
                      background: d.is_active ? '#FFF5F5' : '#E8F4EE',
                      color:      d.is_active ? '#B84040' : '#3D7A5C',
                      border: `1px solid ${d.is_active ? '#F0C0C0' : '#9FD4B8'}`,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {d.is_active ? 'Деактивировать' : 'Активировать'}
                  </button>
                  <button
                    onClick={() => deleteDoctor(d.id)}
                    style={{
                      padding: '5px 12px', borderRadius: 7, fontSize: 11,
                      background: '#F5F2EE', color: '#B84040',
                      border: '1px solid #DDD8D0',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Удалить
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}