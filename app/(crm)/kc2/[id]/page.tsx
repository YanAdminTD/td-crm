'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Client, Subscription, SubscriptionService, Refund } from '@/types'

interface FullClient extends Client {
  subscriptions?: (Subscription & {
    subscription_services?: (SubscriptionService & {
      services?: { id: string; name: string; price?: number }
    })[]
  })[]
}

/* ── helpers ─────────────────────────────────────────────── */
const CHECK = (
  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
    <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

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
  borderRadius: 14, padding: 20, marginBottom: 14,
  boxShadow: '0 2px 8px rgba(32,54,74,.06)',
}
const sSecTitle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: '#8A9BB0',
  textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12,
}

const STATUS_LABEL: Record<string, string> = {
  paid: 'Оплачен', active: 'Активный', vip: 'VIP', refund_requested: 'Запрос возврата',
}

export default function KC2ClientPage({ params }: { params: { id: string } }) {
  const { profile, role } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [client,     setClient]     = useState<FullClient | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [notFound,   setNotFound]   = useState(false)

  /* edit form */
  const [editing,    setEditing]    = useState(false)
  const [editForm,   setEditForm]   = useState({ full_name: '', phone: '', comment: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError,  setEditError]  = useState('')

  /* refund form */
  const [showRefund,    setShowRefund]    = useState(false)
  const [refundForm,    setRefundForm]    = useState({ reason: '', amount: '', comment: '', subscription_id: '' })
  const [refundSaving,  setRefundSaving]  = useState(false)
  const [refundError,   setRefundError]   = useState('')
  const [refundSuccess, setRefundSuccess] = useState('')

  /* procedure mark */
  const [markingId, setMarkingId] = useState<string | null>(null)

  const isAdmin    = role === 'admin'
  const isKC2      = role === 'kc2'
  const isDoctor   = role === 'doctor'
  const canEdit    = isKC2 || isAdmin
  const canMark    = isDoctor || isAdmin
  const canRefund  = isKC2 || isAdmin
  const canFinance = role === 'finance' || isAdmin

  /* ── load ─────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        subscriptions (
          *,
          subscription_services (
            *,
            services ( id, name, price )
          )
        )
      `)
      .eq('id', params.id)
      .single()

    if (error || !data) { setNotFound(true); setLoading(false); return }
    const c = data as FullClient
    setClient(c)
    setEditForm({ full_name: c.full_name, phone: c.phone, comment: c.comment ?? '' })
    setLoading(false)
  }, [params.id, supabase])

  useEffect(() => { load() }, [load])

  /* ── save edit ─────────────────────────────────────────── */
  const saveEdit = async () => {
    setEditError('')
    if (!editForm.full_name.trim()) { setEditError('Введите имя.'); return }
    if (!editForm.phone.trim())     { setEditError('Введите телефон.'); return }
    setEditSaving(true)
    const { error } = await supabase
      .from('clients')
      .update({
        full_name: editForm.full_name.trim(),
        phone:     editForm.phone.trim(),
        comment:   editForm.comment.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
    if (error) { setEditError(error.message); setEditSaving(false); return }
    setEditing(false)
    setEditSaving(false)
    await load()
  }

  /* ── mark procedure done ───────────────────────────────── */
  const markProcDone = async (svcRowId: string) => {
    setMarkingId(svcRowId)
    await supabase
      .from('subscription_services')
      .update({ used_visits: 1 })
      .eq('id', svcRowId)
    setMarkingId(null)
    await load()
  }

  /* ── create refund ─────────────────────────────────────── */
  const setRF = (k: string, v: string) => setRefundForm(p => ({ ...p, [k]: v }))

  const submitRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    setRefundError('')
    if (!refundForm.reason.trim()) { setRefundError('Укажите причину возврата.'); return }
    const amount = parseInt(refundForm.amount)
    if (isNaN(amount) || amount <= 0) { setRefundError('Укажите корректную сумму.'); return }

    setRefundSaving(true)

    // Insert into refunds table
    const { error: refErr } = await supabase.from('refunds').insert({
      client_id:       params.id,
      subscription_id: refundForm.subscription_id || null,
      amount,
      reason:          refundForm.reason.trim(),
      status:          'requested',
      requested_by:    profile?.id ?? null,
      lawyer_comment:  refundForm.comment.trim() || null,
      requested_at:    new Date().toISOString(),
    })
    if (refErr) { setRefundError(refErr.message); setRefundSaving(false); return }

    // Update client status to refund_requested
    await supabase
      .from('clients')
      .update({ status: 'refund_requested', updated_at: new Date().toISOString() })
      .eq('id', params.id)

    setRefundSuccess('Запрос на возврат отправлен. Юрист получит уведомление.')
    setRefundForm({ reason: '', amount: '', comment: '', subscription_id: '' })
    setShowRefund(false)
    setRefundSaving(false)
    await load()
  }

  /* ── update client status (admin) ─────────────────────── */
  const updateStatus = async (status: string) => {
    await supabase.from('clients').update({ status, updated_at: new Date().toISOString() }).eq('id', params.id)
    await load()
  }

  /* ── render guards ─────────────────────────────────────── */
  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: '#8A9BB0', fontSize: 12 }}>Загрузка...</div>
  )
  if (notFound || !client) return (
    <div>
      <button onClick={() => router.back()} style={{ padding: '7px 14px', borderRadius: 8, background: '#F5F2EE', color: '#20364A', border: '1px solid #DDD8D0', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 14 }}>
        ← Назад
      </button>
      <div style={{ ...sCard, textAlign: 'center', padding: 40, color: '#8A9BB0' }}>Клиент не найден</div>
    </div>
  )

  const sub   = client.subscriptions?.[0]
  const procs = sub?.subscription_services ?? []
  const done  = procs.filter(p => p.used_visits > 0).length
  const tot   = procs.length
  const pct   = tot > 0 ? Math.round(done / tot * 100) : 0
  const isRefundRequested = client.status === 'refund_requested'

  return (
    <div>
      <button onClick={() => router.back()} style={{ padding: '7px 14px', borderRadius: 8, background: '#F5F2EE', color: '#20364A', border: '1px solid #DDD8D0', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 14 }}>
        ← Назад
      </button>

      {/* ── refund success ────────────────────────── */}
      {refundSuccess && (
        <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 9, background: '#E8F4EE', border: '1px solid #9FD4B8', color: '#3D7A5C', fontSize: 11, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6.5" stroke="#3D7A5C" strokeWidth="1.2"/><path d="M4.5 7l2 2 3-3" stroke="#3D7A5C" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {refundSuccess}
          <button onClick={() => setRefundSuccess('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#3D7A5C', fontSize: 14 }}>×</button>
        </div>
      )}

      {/* ── CLIENT HEADER ─────────────────────────── */}
      <div style={sCard}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          {/* avatar */}
          <div style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            background: isRefundRequested ? '#B84040' : '#20364A',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Forum, serif', fontSize: 20,
          }}>
            {client.full_name[0].toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {!editing ? (
              <>
                <div style={{ fontFamily: 'Forum, serif', fontSize: 20, color: '#20364A', marginBottom: 2 }}>
                  {client.full_name}
                </div>
                <div style={{ fontSize: 12, color: '#4A5568' }}>{client.phone}</div>
                {client.email && <div style={{ fontSize: 11, color: '#8A9BB0', marginTop: 1 }}>{client.email}</div>}
                {client.comment && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#4A5568', fontStyle: 'italic', padding: '6px 10px', background: '#F5F2EE', borderRadius: 7, border: '1px solid #EDE8E1' }}>
                    {client.comment}
                  </div>
                )}
              </>
            ) : (
              /* Edit form */
              <div>
                {editError && (
                  <div style={{ marginBottom: 8, padding: '7px 10px', borderRadius: 7, background: '#FAEAEA', border: '1px solid #F0C0C0', color: '#B84040', fontSize: 11 }}>{editError}</div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                  <div>
                    <label style={sLabel}>Имя *</label>
                    <input style={sInput} value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} disabled={editSaving}/>
                  </div>
                  <div>
                    <label style={sLabel}>Телефон *</label>
                    <input style={sInput} type="tel" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} disabled={editSaving}/>
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={sLabel}>Комментарий</label>
                  <textarea style={{ ...sInput, resize: 'vertical' }} rows={2} value={editForm.comment} onChange={e => setEditForm(p => ({ ...p, comment: e.target.value }))} disabled={editSaving}/>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setEditing(false)} disabled={editSaving} style={{ padding: '6px 14px', borderRadius: 7, background: '#F5F2EE', color: '#20364A', border: '1px solid #DDD8D0', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Отмена</button>
                  <button onClick={saveEdit} disabled={editSaving} style={{ padding: '6px 14px', borderRadius: 7, background: editSaving ? '#ccc' : '#20364A', color: '#ECE7E2', border: 'none', fontSize: 11, cursor: editSaving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                    {editSaving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* status + actions */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            <span className={`pill ${
              isRefundRequested ? 'p-refund' :
              client.status === 'vip' ? 'p-vip' :
              client.status === 'paid' ? 'p-paid' : 'p-active'
            }`}>
              {STATUS_LABEL[client.status] ?? client.status}
            </span>

            {isAdmin && (
              <select
                value={client.status}
                onChange={e => updateStatus(e.target.value)}
                style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, border: '1px solid #DDD8D0', background: '#F5F2EE', fontFamily: 'inherit', color: '#20364A', cursor: 'pointer' }}
              >
                {['paid','active','vip','refund_requested'].map(s => (
                  <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
                ))}
              </select>
            )}

            {canEdit && !editing && (
              <button onClick={() => setEditing(true)} style={{ padding: '5px 12px', borderRadius: 7, background: '#F5F2EE', color: '#20364A', border: '1px solid #DDD8D0', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                Редактировать
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── SUBSCRIPTION + PROCEDURES ─────────────── */}
      {sub && (
        <div style={sCard}>
          <div style={sSecTitle}>Абонемент: {sub.name}</div>

          {/* progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#EDE8E1', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, background: '#C45C3C', width: `${pct}%`, transition: 'width .3s' }}/>
            </div>
            <span style={{ fontSize: 11, color: '#8A9BB0', flexShrink: 0 }}>{done}/{tot} · {pct}%</span>
          </div>

          {/* procedures */}
          {procs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px 0', color: '#8A9BB0', fontSize: 11 }}>
              Процедуры не найдены
            </div>
          ) : procs.map((p, i) => {
            const isDone  = p.used_visits > 0
            const marking = markingId === p.id
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, marginBottom: 6,
                background: isDone ? '#E8F4EE' : '#FAFAFA',
                border: `1px solid ${isDone ? '#9FD4B8' : '#EDE8E1'}`,
                transition: 'all .15s',
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isDone ? '#3D7A5C' : 'transparent',
                  border: `1.5px solid ${isDone ? '#3D7A5C' : '#DDD8D0'}`,
                }}>
                  {isDone && CHECK}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#20364A' }}>
                    {p.services?.name ?? 'Процедура'}
                  </div>
                  <div style={{ fontSize: 10, color: '#8A9BB0', marginTop: 1 }}>
                    {isDone ? 'Выполнена' : 'Не выполнена'}
                    {p.services?.price ? ` · ${p.services.price.toLocaleString('ru')} ₸` : ''}
                  </div>
                </div>
                {canMark && !isDone && (
                  <button
                    onClick={() => markProcDone(p.id)}
                    disabled={marking}
                    style={{
                      padding: '5px 12px', borderRadius: 7,
                      background: marking ? '#ccc' : '#3D7A5C', color: '#fff', border: 'none',
                      fontSize: 11, fontWeight: 500, cursor: marking ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {marking ? '...' : 'Выполнена ✓'}
                  </button>
                )}
                {isDone && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#E8F4EE', color: '#3D7A5C', border: '1px solid #9FD4B8', whiteSpace: 'nowrap' }}>
                    Выполнена
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── REFUND REQUEST SECTION ─────────────────── */}
      {canRefund && (
        <div style={sCard}>
          <div style={sSecTitle}>Запрос на возврат</div>

          {isRefundRequested ? (
            <div style={{ padding: '10px 14px', borderRadius: 9, background: '#FFF5F5', border: '1px solid #F0C8C8', color: '#B84040', fontSize: 11, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="6.5" r="6" stroke="#B84040" strokeWidth="1.2"/>
                <path d="M6.5 4v3.5M6.5 9v.5" stroke="#B84040" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              Запрос на возврат уже создан. Ожидается решение администратора.
            </div>
          ) : (
            <>
              {!showRefund ? (
                <button
                  onClick={() => setShowRefund(true)}
                  style={{
                    padding: '8px 18px', borderRadius: 8,
                    background: '#FAEAEA', color: '#B84040',
                    border: '1px solid #F0C0C0', fontSize: 12, fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Создать запрос на возврат
                </button>
              ) : (
                <div>
                  <div style={{ marginBottom: 12, padding: '9px 12px', borderRadius: 8, background: '#FFF8F8', border: '1px solid #F0C8C8', fontSize: 11, color: '#B84040', lineHeight: 1.5 }}>
                    ⚠ После создания запроса клиенту будет присвоен статус «Запрос возврата».
                    Юрист добавит примечание, финальное решение принимает администратор.
                  </div>

                  {refundError && (
                    <div style={{ marginBottom: 10, padding: '7px 10px', borderRadius: 7, background: '#FAEAEA', border: '1px solid #F0C0C0', color: '#B84040', fontSize: 11 }}>{refundError}</div>
                  )}

                  <form onSubmit={submitRefund}>
                    <div style={{ marginBottom: 10 }}>
                      <label style={sLabel}>Причина возврата *</label>
                      <textarea style={{ ...sInput, resize: 'vertical' }} rows={3} value={refundForm.reason} onChange={e => setRF('reason', e.target.value)} placeholder="Подробно опишите причину возврата..." disabled={refundSaving} required/>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
                      <div>
                        <label style={sLabel}>Сумма возврата (₸) *</label>
                        <input style={sInput} type="number" value={refundForm.amount} onChange={e => setRF('amount', e.target.value)} placeholder="0" disabled={refundSaving} min="1" required/>
                      </div>
                      {sub && (
                        <div>
                          <label style={sLabel}>Абонемент</label>
                          <select style={sInput} value={refundForm.subscription_id} onChange={e => setRF('subscription_id', e.target.value)} disabled={refundSaving}>
                            <option value="">— Не указан —</option>
                            <option value={sub.id}>{sub.name}</option>
                          </select>
                        </div>
                      )}
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={sLabel}>Комментарий (необязательно)</label>
                      <textarea style={{ ...sInput, resize: 'vertical' }} rows={2} value={refundForm.comment} onChange={e => setRF('comment', e.target.value)} placeholder="Дополнительная информация..." disabled={refundSaving}/>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => { setShowRefund(false); setRefundError('') }} disabled={refundSaving}
                        style={{ padding: '7px 16px', borderRadius: 8, background: '#F5F2EE', color: '#20364A', border: '1px solid #DDD8D0', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Отмена
                      </button>
                      <button type="submit" disabled={refundSaving}
                        style={{ padding: '7px 18px', borderRadius: 8, background: refundSaving ? '#ccc' : '#B84040', color: '#fff', border: 'none', fontSize: 12, fontWeight: 500, cursor: refundSaving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                        {refundSaving ? 'Отправка...' : 'Отправить запрос на возврат'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── FINANCE ACTIONS ───────────────────────── */}
      {canFinance && (
        <div style={sCard}>
          <div style={sSecTitle}>Финансовые действия</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/finance')} style={{ padding: '7px 16px', borderRadius: 8, background: '#20364A', color: '#ECE7E2', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              + Новый абонемент
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
