'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Refund, RefundStatus } from '@/types'

interface RefundRow extends Omit<Refund, 'clients' | 'subscriptions' | 'profiles'> {
  clients?:       { id: string; full_name: string; phone: string }
  subscriptions?: { id: string; name: string }
  profiles?:      { id: string; full_name: string }
}

const STATUS_LABEL: Record<string, string> = {
  requested:     'Новый',
  lawyer_review: 'На рассмотрении',
  approved:      'Одобрен',
  rejected:      'Отклонён',
}
const STATUS_PILL: Record<string, string> = {
  requested:     'p-new',
  lawyer_review: 'p-contact',
  approved:      'p-active',
  rejected:      'p-fail',
}
const STATUS_COLOR: Record<string, string> = {
  requested:     '#3A6EA5',
  lawyer_review: '#9A6B1A',
  approved:      '#3D7A5C',
  rejected:      '#B84040',
}

const sCard: React.CSSProperties = {
  background: '#fff', border: '1px solid #DDD8D0',
  borderRadius: 14, padding: 20, marginBottom: 14,
  boxShadow: '0 2px 8px rgba(32,54,74,.06)',
}
const sLabel: React.CSSProperties = {
  display: 'block', fontSize: 9, fontWeight: 700, color: '#8A9BB0',
  letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 4,
}
const sInput: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid #DDD8D0', background: '#F5F2EE',
  fontSize: 12, color: '#20364A', fontFamily: 'inherit', outline: 'none',
}

type TabType = 'open' | 'mine' | 'all'

export default function RefundsPage() {
  const { profile, role } = useAuth()
  const supabase = createClient()

  const isAdmin  = role === 'admin'
  const isLawyer = role === 'lawyer'

  const [tab,       setTab]       = useState<TabType>('open')
  const [refunds,   setRefunds]   = useState<RefundRow[]>([])
  const [loading,   setLoading]   = useState(true)

  /* detail view */
  const [selected,    setSelected]    = useState<RefundRow | null>(null)
  const [lawyerNote,  setLawyerNote]  = useState('')
  const [adminNote,   setAdminNote]   = useState('')
  const [saving,      setSaving]      = useState(false)
  const [saveMsg,     setSaveMsg]     = useState('')
  const [saveError,   setSaveError]   = useState('')

  /* ── load refunds ─────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('refunds')
      .select(`
        *,
        clients ( id, full_name, phone ),
        subscriptions ( id, name ),
        profiles ( id, full_name )
      `)
      .order('requested_at', { ascending: false })

    if (tab === 'open') {
      query = query.in('status', ['requested', 'lawyer_review'])
    } else if (tab === 'mine' && isLawyer) {
      query = query.in('status', ['requested', 'lawyer_review'])
    }
    // 'all' — no filter (admin sees everything)

    const { data, error } = await query
    if (!error) setRefunds((data ?? []) as RefundRow[])
    setLoading(false)
  }, [supabase, tab, isLawyer])

  useEffect(() => { load() }, [load])

  /* ── open detail ─────────────────────────────────────── */
  const openRefund = (r: RefundRow) => {
    setSelected(r)
    setLawyerNote(r.lawyer_comment ?? '')
    setAdminNote(r.admin_comment ?? '')
    setSaveMsg('')
    setSaveError('')
  }

  /* ── lawyer: save comment + change status ────────────── */
  const lawyerSave = async (newStatus: 'lawyer_review' | 'rejected') => {
    if (!selected) return
    setSaveError('')
    setSaving(true)
    const { error } = await supabase
      .from('refunds')
      .update({
        lawyer_comment: lawyerNote.trim() || null,
        status:         newStatus,
        updated_at:     new Date().toISOString(),
      })
      .eq('id', selected.id)
    if (error) { setSaveError(error.message); setSaving(false); return }
    setSaveMsg(`✓ Статус изменён: ${STATUS_LABEL[newStatus]}`)
    setSaving(false)
    await load()
    setSelected(prev => prev ? { ...prev, lawyer_comment: lawyerNote, status: newStatus } : null)
  }

  /* ── admin: approve or reject ────────────────────────── */
  const adminDecide = async (approved: boolean) => {
    if (!selected) return
    setSaveError('')
    setSaving(true)
    const newStatus = approved ? 'approved' : 'rejected'
    const { error } = await supabase
      .from('refunds')
      .update({
        admin_comment: adminNote.trim() || null,
        status:        newStatus,
        updated_at:    new Date().toISOString(),
      })
      .eq('id', selected.id)
    if (error) { setSaveError(error.message); setSaving(false); return }

    // If approved: update client status back to active
    if (approved && selected.clients?.id) {
      await supabase
        .from('clients')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', selected.clients.id)
    }

    setSaveMsg(`✓ Возврат ${approved ? 'одобрен' : 'отклонён'}.`)
    setSaving(false)
    await load()
    setSelected(prev => prev ? { ...prev, admin_comment: adminNote, status: newStatus } : null)
  }

  /* ── counts ──────────────────────────────────────────── */
  const openCount = refunds.filter(r => r.status === 'requested' || r.status === 'lawyer_review').length

  return (
    <div>
      {/* Header info */}
      <div style={{
        background: '#ECE7E2', borderRadius: 8, padding: '8px 13px',
        fontSize: 11, color: '#4A5568', marginBottom: 14,
        borderLeft: `3px solid ${isLawyer ? '#9A6B1A' : '#C45C3C'}`, lineHeight: 1.6,
      }}>
        {isLawyer
          ? 'Юрист: просматривайте запросы, добавляйте примечания. Финальное решение принимает администратор.'
          : 'Администратор: финальное одобрение или отклонение возвратов.'
        }
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {([
          { key: 'open', label: `Открытые (${openCount})` },
          ...(isAdmin ? [{ key: 'all', label: 'Все возвраты' }] : []),
        ] as { key: TabType; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '7px 16px', borderRadius: 20, fontSize: 11, fontWeight: 500,
            border: `1px solid ${tab === t.key ? '#C45C3C' : '#DDD8D0'}`,
            background: tab === t.key ? '#C45C3C' : '#fff',
            color: tab === t.key ? '#fff' : '#8A9BB0',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>{t.label}</button>
        ))}
        <button onClick={load} style={{
          marginLeft: 'auto', padding: '7px 14px', borderRadius: 20,
          background: '#F5F2EE', color: '#20364A', border: '1px solid #DDD8D0',
          fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
        }}>Обновить</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 420px' : '1fr', gap: 14, alignItems: 'start' }}>

        {/* ── REFUND LIST ───────────────────────────── */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: '#8A9BB0', fontSize: 12 }}>Загрузка...</div>
          ) : refunds.length === 0 ? (
            <div style={{ ...sCard, textAlign: 'center', padding: 40, color: '#8A9BB0' }}>
              {tab === 'open' ? 'Открытых возвратов нет' : 'Возвратов нет'}
            </div>
          ) : (
            refunds.map(r => {
              const isSelected = selected?.id === r.id
              return (
                <div
                  key={r.id}
                  onClick={() => isSelected ? setSelected(null) : openRefund(r)}
                  style={{
                    ...sCard,
                    cursor: 'pointer',
                    borderColor: isSelected ? '#C45C3C' : r.status === 'requested' ? '#F0C8C8' : '#DDD8D0',
                    background: isSelected ? '#FFF8F6' : r.status === 'requested' ? '#FFF5F5' : '#fff',
                    transition: 'all .15s',
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    {/* client avatar */}
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: STATUS_COLOR[r.status] ?? '#C45C3C', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700,
                    }}>
                      {(r.clients?.full_name ?? '?')[0].toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: '#20364A' }}>
                          {r.clients?.full_name ?? '—'}
                        </span>
                        <span className={`pill ${STATUS_PILL[r.status] ?? 'p-new'}`}>
                          {STATUS_LABEL[r.status] ?? r.status}
                        </span>
                      </div>

                      <div style={{ fontSize: 11, color: '#4A5568', marginBottom: 3 }}>
                        {r.clients?.phone ?? '—'}
                        {r.subscriptions?.name && (
                          <span style={{ marginLeft: 8, fontSize: 10, color: '#8A9BB0' }}>· {r.subscriptions.name}</span>
                        )}
                      </div>

                      {r.reason && (
                        <div style={{ fontSize: 11, color: '#B84040', fontStyle: 'italic', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          "{r.reason.substring(0, 70)}{r.reason.length > 70 ? '...' : ''}"
                        </div>
                      )}

                      {r.lawyer_comment && (
                        <div style={{ fontSize: 10, color: '#9A6B1A', marginTop: 2 }}>
                          Юрист: {r.lawyer_comment.substring(0, 60)}...
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'Forum, serif', fontSize: 16, color: '#20364A' }}>
                        {r.amount.toLocaleString('ru')} ₸
                      </div>
                      <div style={{ fontSize: 10, color: '#8A9BB0', marginTop: 2 }}>
                        {new Date(r.requested_at).toLocaleDateString('ru')}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ── DETAIL PANEL ─────────────────────────── */}
        {selected && (
          <div style={{ position: 'sticky', top: 0 }}>
            <div style={sCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontFamily: 'Forum, serif', fontSize: 17, color: '#20364A' }}>
                  Возврат #{selected.id.substring(0, 8)}
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A9BB0', fontSize: 18, lineHeight: 1 }}>×</button>
              </div>

              {/* status */}
              <span className={`pill ${STATUS_PILL[selected.status] ?? 'p-new'}`} style={{ marginBottom: 14, display: 'inline-block' }}>
                {STATUS_LABEL[selected.status] ?? selected.status}
              </span>

              {/* client info */}
              <div style={{ padding: '10px 12px', background: '#F5F2EE', borderRadius: 9, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#20364A', marginBottom: 2 }}>
                  {selected.clients?.full_name ?? '—'}
                </div>
                <div style={{ fontSize: 11, color: '#4A5568' }}>{selected.clients?.phone ?? '—'}</div>
                {selected.subscriptions?.name && (
                  <div style={{ fontSize: 10, color: '#8A9BB0', marginTop: 3 }}>Абонемент: {selected.subscriptions.name}</div>
                )}
                <Link href={`/kc2/${selected.clients?.id}`} style={{ fontSize: 10, color: '#C45C3C', textDecoration: 'none', display: 'inline-block', marginTop: 4 }}>
                  Открыть карточку клиента →
                </Link>
              </div>

              {/* amount + reason */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: '#8A9BB0', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 3 }}>Сумма</div>
                <div style={{ fontFamily: 'Forum, serif', fontSize: 20, color: '#B84040' }}>
                  {selected.amount.toLocaleString('ru')} ₸
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: '#8A9BB0', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>Причина</div>
                <div style={{ fontSize: 12, color: '#20364A', lineHeight: 1.6, padding: '8px 10px', background: '#FFF5F5', borderRadius: 8, border: '1px solid #F0C8C8' }}>
                  {selected.reason}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #EDE8E1', paddingTop: 14 }} />

              {/* success/error messages */}
              {saveMsg && (
                <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: '#E8F4EE', border: '1px solid #9FD4B8', color: '#3D7A5C', fontSize: 11, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="#3D7A5C" strokeWidth="1.2"/><path d="M3.5 6l2 2 3-3" stroke="#3D7A5C" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {saveMsg}
                  <button onClick={() => setSaveMsg('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#3D7A5C', fontSize: 13 }}>×</button>
                </div>
              )}
              {saveError && (
                <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: '#FAEAEA', border: '1px solid #F0C0C0', color: '#B84040', fontSize: 11 }}>
                  {saveError}
                </div>
              )}

              {/* ── LAWYER ACTIONS ── */}
              {isLawyer && selected.status !== 'approved' && selected.status !== 'rejected' && (
                <div>
                  <div style={{ fontSize: 10, color: '#9A6B1A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
                    Примечание юриста
                  </div>
                  <textarea
                    value={lawyerNote}
                    onChange={e => setLawyerNote(e.target.value)}
                    placeholder="Опишите ваш анализ ситуации..."
                    rows={4}
                    style={{ ...sInput, resize: 'vertical', marginBottom: 10 }}
                    disabled={saving}
                  />
                  <div style={{ fontSize: 10, color: '#8A9BB0', marginBottom: 10, lineHeight: 1.5 }}>
                    После добавления примечания смените статус. Финальное решение — за администратором.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => lawyerSave('lawyer_review')}
                      disabled={saving}
                      style={{ flex: 1, padding: '8px', borderRadius: 8, background: saving ? '#ccc' : '#9A6B1A', color: '#fff', border: 'none', fontSize: 12, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                      На рассмотрении
                    </button>
                    <button
                      onClick={() => lawyerSave('rejected')}
                      disabled={saving}
                      style={{ flex: 1, padding: '8px', borderRadius: 8, background: saving ? '#ccc' : '#B84040', color: '#fff', border: 'none', fontSize: 12, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                      Отклонить
                    </button>
                  </div>
                </div>
              )}

              {/* ── ADMIN ACTIONS ── */}
              {isAdmin && (
                <div>
                  {/* lawyer comment display */}
                  {selected.lawyer_comment && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: '#8A9BB0', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>Примечание юриста</div>
                      <div style={{ fontSize: 11, color: '#20364A', lineHeight: 1.6, padding: '8px 10px', background: '#FDF3E3', borderRadius: 8, border: '1px solid rgba(154,107,26,.2)', fontStyle: 'italic' }}>
                        "{selected.lawyer_comment}"
                      </div>
                    </div>
                  )}

                  {/* admin note + decision */}
                  {selected.status !== 'approved' && selected.status !== 'rejected' ? (
                    <div>
                      <div style={{ fontSize: 10, color: '#20364A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
                        Решение администратора
                      </div>
                      <label style={sLabel}>Комментарий администратора</label>
                      <textarea
                        value={adminNote}
                        onChange={e => setAdminNote(e.target.value)}
                        placeholder="Обоснование решения..."
                        rows={3}
                        style={{ ...sInput, resize: 'vertical', marginBottom: 12 }}
                        disabled={saving}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => adminDecide(true)}
                          disabled={saving}
                          style={{ flex: 1, padding: '9px', borderRadius: 8, background: saving ? '#ccc' : '#B84040', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                          Одобрить возврат
                        </button>
                        <button
                          onClick={() => adminDecide(false)}
                          disabled={saving}
                          style={{ flex: 1, padding: '9px', borderRadius: 8, background: saving ? '#ccc' : '#3D7A5C', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                          Отклонить
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding: '10px 14px', borderRadius: 9,
                      background: selected.status === 'approved' ? '#E8F4EE' : '#F5F2EE',
                      border: `1px solid ${selected.status === 'approved' ? '#9FD4B8' : '#DDD8D0'}`,
                      fontSize: 11,
                      color: selected.status === 'approved' ? '#3D7A5C' : '#4A5568',
                    }}>
                      {selected.status === 'approved'
                        ? '✓ Возврат одобрен администратором'
                        : '✗ Возврат отклонён администратором'}
                      {selected.admin_comment && (
                        <div style={{ marginTop: 5, fontSize: 10, fontStyle: 'italic', opacity: .8 }}>
                          "{selected.admin_comment}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* If status is final — show result only */}
              {!isAdmin && !isLawyer && (
                <div style={{
                  padding: '10px 14px', borderRadius: 9,
                  background: selected.status === 'approved' ? '#E8F4EE' : '#F5F2EE',
                  fontSize: 11, color: '#4A5568',
                }}>
                  Статус: {STATUS_LABEL[selected.status] ?? selected.status}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
