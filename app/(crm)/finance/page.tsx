'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Client, Service } from '@/types'

/* ─────────────────────────────────────────────────────────
   Finance page — Оформление абонементов
   Исправления:
   1. loadKC2 → .eq('status', 'active_client')
   2. После оформления → status = 'active_client'
   3. subscription_services создаются для ВСЕХ услуг корзины
   4. total_visits = cart.length, used_visits = 0
   5. remaining_visits не вставляется (generated column)
   6. После оформления: закрыть корзину, refetch списка
   ───────────────────────────────────────────────────────── */

const CHECK = (
  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
    <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const STATUS_LABEL: Record<string, string> = {
  new_lead:      'Новый лид',
  in_progress:   'В работе',
  active_client: 'Клиент КЦ-2',
  paid:          'Оплачен',
  active:        'Активный',
  vip:           'VIP',
  lost:          'Отказ',
}
const STATUS_PILL: Record<string, string> = {
  new_lead:      'p-new',
  in_progress:   'p-contact',
  active_client: 'p-active',
  paid:          'p-paid',
  active:        'p-active',
  vip:           'p-vip',
  lost:          'p-fail',
}

/* ── styles ──────────────────────────────────────────────── */
const sLabel: React.CSSProperties = {
  display: 'block', fontSize: 9, fontWeight: 700, color: '#8A9BB0',
  letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 4,
}
const sInput: React.CSSProperties = {
  width: '100%', padding: '8px 11px', borderRadius: 8,
  border: '1px solid #DDD8D0', background: '#F5F2EE',
  fontSize: 12, color: '#20364A', fontFamily: 'inherit', outline: 'none',
}

export default function FinancePage() {
  const { profile } = useAuth()
  const supabase    = createClient()

  const [tab,      setTab]      = useState(0)
  const [clients,  setClients]  = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading,  setLoading]  = useState(true)

  /* cart */
  const [cartFor,   setCartFor]   = useState<Client | null>(null)
  const [cart,      setCart]      = useState<string[]>([])
  const [abName,    setAbName]    = useState('')
  const [abTotal,   setAbTotal]   = useState('')
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveOk,    setSaveOk]    = useState('')

  /* ── data loaders ───────────────────────────────────── */

  // KC-1: лиды ожидающие перевода
  const loadKC1 = useCallback(async (): Promise<Client[]> => {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .in('status', ['new_lead', 'in_progress'])
      .order('created_at', { ascending: false })
    return (data ?? []) as Client[]
  }, [supabase])

  // KC-2: ТОЛЬКО статус active_client
  const loadKC2 = useCallback(async (): Promise<Client[]> => {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('status', 'active_client')
      .order('created_at', { ascending: false })
    return (data ?? []) as Client[]
  }, [supabase])

  const loadServices = useCallback(async (): Promise<Service[]> => {
    const { data } = await supabase
      .from('services')
      .select('*, service_categories(name)')
      .eq('is_active', true)
      .order('name')
    return (data ?? []) as Service[]
  }, [supabase])

  const reloadAll = useCallback(async () => {
    setLoading(true)
    const [list, svcs] = await Promise.all([
      tab === 0 ? loadKC1() : loadKC2(),
      loadServices(),
    ])
    setClients(list)
    setServices(svcs)
    setLoading(false)
  }, [tab, loadKC1, loadKC2, loadServices])

  useEffect(() => { reloadAll() }, [reloadAll])

  /* ── cart helpers ──────────────────────────────────── */
  const openCart = (client: Client) => {
    setCartFor(client)
    setCart([])
    setAbName('')
    setAbTotal('')
    setSaveError('')
    setSaveOk('')
  }
  const closeCart = () => {
    setCartFor(null)
    setCart([])
    setSaveError('')
  }
  const toggleCart = (id: string) =>
    setCart(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const listTotal = cart.reduce(
    (sum, id) => sum + (services.find(x => x.id === id)?.price ?? 0),
    0
  )

  /* ── оформить абонемент ─────────────────────────────── */
  const saveCart = async () => {
    if (!cartFor)          return
    if (!abName.trim())    { setSaveError('Введите название абонемента.'); return }
    if (cart.length === 0) { setSaveError('Выберите хотя бы одну процедуру.'); return }

    const totalAmount = parseInt(abTotal) || listTotal
    if (!totalAmount)      { setSaveError('Введите сумму.'); return }

    setSaving(true)
    setSaveError('')

    /* 1. Создать subscription
          total_visits  = cart.length
          used_visits   = 0
          remaining_visits НЕ вставляем (generated column) */
    const { data: sub, error: subErr } = await supabase
      .from('subscriptions')
      .insert({
        client_id:    cartFor.id,
        name:         abName.trim(),
        total_visits: cart.length,   // = количество выбранных услуг
        used_visits:  0,
        status:       'active',
        sold_by:      profile?.id ?? null,
        created_at:   new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      })
      .select()
      .single()

    if (subErr || !sub) {
      setSaveError(subErr?.message ?? 'Ошибка создания абонемента.')
      setSaving(false)
      return
    }

    /* 2. Создать subscription_services для КАЖДОЙ услуги из cart
          cart.map(serviceId => ...) — все услуги, не только первая */
    const svcRows = cart.map(serviceId => ({
      subscription_id: sub.id,
      service_id:      serviceId,
      allowed_visits:  1,
      used_visits:     0,
      created_at:      new Date().toISOString(),
    }))

    const { error: svcErr } = await supabase
      .from('subscription_services')
      .insert(svcRows)

    if (svcErr) {
      // Откат: удаляем подписку если услуги не сохранились
      await supabase.from('subscriptions').delete().eq('id', sub.id)
      setSaveError('Ошибка сохранения процедур: ' + svcErr.message)
      setSaving(false)
      return
    }

    /* 3. Перевести клиента в КЦ-2 → status = 'active_client' */
    const { error: clientErr } = await supabase
      .from('clients')
      .update({
        status:     'active_client',
        updated_at: new Date().toISOString(),
      })
      .eq('id', cartFor.id)

    if (clientErr) {
      setSaveError('Абонемент создан, но статус клиента не обновился: ' + clientErr.message)
      setSaving(false)
      return
    }

    /* 4. Успех: закрыть корзину, обновить список
          tab 0 → клиент исчезнет из KC-1 (статус сменился)
          tab 1 → список KC-2 обновится */
    const name = cartFor.full_name
    closeCart()
    setSaving(false)
    setSaveOk(`✓ Абонемент «${abName.trim()}» оформлен. ${name} переведён в КЦ-2.`)
    await reloadAll()
  }

  /* ── группировка услуг по категориям ──────────────────── */
  const catMap: Record<string, Service[]> = {}
  services.forEach(s => {
    const cat = (s as any).service_categories?.name ?? 'Другое'
    if (!catMap[cat]) catMap[cat] = []
    catMap[cat].push(s)
  })
  const catKeys = Object.keys(catMap).sort()

  /* ══════════════════════════════════════════════════════
     CART VIEW
  ══════════════════════════════════════════════════════ */
  if (cartFor) {
    return (
      <div>
        <button onClick={closeCart} style={{
          padding: '7px 14px', borderRadius: 8, marginBottom: 14,
          background: '#F5F2EE', color: '#20364A',
          border: '1px solid #DDD8D0', fontSize: 12,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          ← Назад
        </button>

        <div style={{ fontFamily: 'Forum, serif', fontSize: 18, color: '#20364A', marginBottom: 3 }}>
          Оформление абонемента
        </div>
        <div style={{ fontSize: 11, color: '#8A9BB0', marginBottom: 16 }}>
          Клиент: <strong style={{ color: '#20364A' }}>{cartFor.full_name}</strong> · {cartFor.phone}
        </div>

        {saveError && (
          <div style={{
            marginBottom: 12, padding: '9px 13px', borderRadius: 9,
            background: '#FAEAEA', border: '1px solid #F0C0C0', color: '#B84040', fontSize: 11,
          }}>
            {saveError}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, alignItems: 'start' }}>

          {/* ── услуги ─────────────────────────────── */}
          <div>
            {catKeys.length === 0 ? (
              <div style={{
                background: '#fff', border: '1px solid #DDD8D0', borderRadius: 14,
                padding: 36, textAlign: 'center', color: '#8A9BB0', fontSize: 12,
              }}>
                Нет активных услуг. Добавьте услуги в разделе Управление.
              </div>
            ) : catKeys.map(cat => (
              <div key={cat} style={{
                background: '#fff', border: '1px solid #DDD8D0',
                borderRadius: 12, padding: '14px 16px', marginBottom: 10,
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: '#8A9BB0',
                  textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10,
                }}>
                  {cat}
                </div>

                {catMap[cat].map(s => {
                  const sel = cart.includes(s.id)
                  return (
                    <div
                      key={s.id}
                      onClick={() => toggleCart(s.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 11px', borderRadius: 9, marginBottom: 5,
                        cursor: 'pointer',
                        border: `1px solid ${sel ? '#9FD4B8' : '#EDE8E1'}`,
                        background: sel ? '#E8F4EE' : '#FAFAFA',
                        transition: 'all .1s',
                      }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: sel ? '#3D7A5C' : 'transparent',
                        border: `1.5px solid ${sel ? '#3D7A5C' : '#DDD8D0'}`,
                      }}>
                        {sel && CHECK}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#20364A' }}>{s.name}</div>
                        {s.duration_minutes && (
                          <div style={{ fontSize: 10, color: '#8A9BB0', marginTop: 1 }}>{s.duration_minutes} мин</div>
                        )}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: sel ? '#3D7A5C' : '#20364A' }}>
                        {s.price.toLocaleString('ru')} ₸
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* ── корзина ────────────────────────────── */}
          <div>
            <div style={{
              background: '#fff', border: '1px solid #DDD8D0',
              borderRadius: 14, padding: 18, position: 'sticky', top: 0,
              boxShadow: '0 4px 16px rgba(32,54,74,.08)',
            }}>
              <div style={{ fontFamily: 'Forum, serif', fontSize: 15, color: '#20364A', marginBottom: 12 }}>
                Корзина
              </div>

              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#8A9BB0', fontSize: 12 }}>
                  ← Выберите процедуры слева
                </div>
              ) : (
                <>
                  {/* выбранные услуги */}
                  {cart.map(id => {
                    const s = services.find(x => x.id === id)
                    if (!s) return null
                    return (
                      <div key={id} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '7px 10px', background: '#F5F2EE',
                        borderRadius: 8, marginBottom: 5, border: '1px solid #EDE8E1',
                      }}>
                        <div style={{ flex: 1, fontSize: 11, fontWeight: 500, color: '#20364A' }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: '#4A5568', marginRight: 4 }}>
                          {s.price.toLocaleString('ru')} ₸
                        </div>
                        <button onClick={() => toggleCart(id)} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#8A9BB0', fontSize: 16, lineHeight: 1, padding: 0,
                        }}>×</button>
                      </div>
                    )
                  })}

                  {/* итог */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 0 5px', borderTop: '1px solid #EDE8E1', marginTop: 6,
                    fontSize: 11, color: '#4A5568',
                  }}>
                    <span>Прайс ({cart.length} проц.)</span>
                    <span style={{ fontWeight: 600 }}>{listTotal.toLocaleString('ru')} ₸</span>
                  </div>

                  {/* форма */}
                  <div style={{ marginTop: 12 }}>
                    <label style={sLabel}>Название абонемента *</label>
                    <input
                      style={sInput} value={abName}
                      onChange={e => setAbName(e.target.value)}
                      placeholder="Инъекционный курс"
                    />
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <label style={sLabel}>Итоговая сумма (₸) *</label>
                    <input
                      style={sInput} type="number" value={abTotal}
                      onChange={e => setAbTotal(e.target.value)}
                      placeholder={String(listTotal)}
                    />
                    <div style={{ fontSize: 9, color: '#8A9BB0', marginTop: 3 }}>
                      Финансист вводит финальную сумму с учётом скидок.
                    </div>
                  </div>

                  <button
                    onClick={saveCart}
                    disabled={saving}
                    style={{
                      width: '100%', padding: '11px', marginTop: 14,
                      borderRadius: 9, border: 'none',
                      background: saving ? '#ccc' : '#3D7A5C',
                      color: '#fff', fontSize: 13, fontWeight: 600,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    {saving && (
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
                        style={{ animation: 'spin 1s linear infinite' }}>
                        <circle cx="6.5" cy="6.5" r="5.5" stroke="rgba(255,255,255,.4)" strokeWidth="1.5"/>
                        <path d="M6.5 1A5.5 5.5 0 0 1 12 6.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    )}
                    {saving ? 'Оформление...' : 'Оформить абонемент ✓'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════
     MAIN VIEW
  ══════════════════════════════════════════════════════ */
  return (
    <div>
      {/* success */}
      {saveOk && (
        <div style={{
          marginBottom: 12, padding: '10px 14px', borderRadius: 10,
          background: '#E8F4EE', border: '1px solid #9FD4B8', color: '#3D7A5C',
          fontSize: 11, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {saveOk}
          <button onClick={() => setSaveOk('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#3D7A5C', fontSize: 14 }}>×</button>
        </div>
      )}

      {/* tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #DDD8D0', marginBottom: 14 }}>
        {['Перевод КЦ-1 → КЦ-2', 'Доп. абонемент (КЦ-2)'].map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            padding: '8px 16px', fontSize: 11, fontWeight: 500,
            cursor: 'pointer', background: 'none', border: 'none',
            borderBottom: `2px solid ${tab === i ? '#C45C3C' : 'transparent'}`,
            marginBottom: -1, color: tab === i ? '#C45C3C' : '#8A9BB0',
            fontFamily: 'inherit',
          }}>{t}</button>
        ))}
      </div>

      {/* info bar */}
      <div style={{
        background: '#ECE7E2', borderRadius: 8, padding: '8px 13px',
        fontSize: 11, color: '#4A5568', marginBottom: 14,
        borderLeft: '3px solid #C45C3C', lineHeight: 1.6,
      }}>
        {tab === 0
          ? 'Выберите лида из КЦ-1 и оформите абонемент. После оформления клиент получит статус «Клиент КЦ-2».'
          : 'Оформите дополнительный абонемент для клиента со статусом «Клиент КЦ-2».'}
      </div>

      {/* list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0', color: '#8A9BB0', fontSize: 12 }}>Загрузка...</div>
      ) : clients.length === 0 ? (
        <div style={{
          background: '#fff', border: '1px solid #DDD8D0', borderRadius: 14,
          padding: 40, textAlign: 'center', color: '#8A9BB0', fontSize: 12,
        }}>
          {tab === 0 ? 'Нет лидов для перевода в КЦ-2' : 'Нет клиентов со статусом «Клиент КЦ-2»'}
        </div>
      ) : (
        clients.map(cl => (
          <div key={cl.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', border: '1px solid #DDD8D0',
            borderRadius: 12, marginBottom: 8, background: '#fff',
            boxShadow: '0 1px 4px rgba(32,54,74,.05)',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: '#20364A', color: '#ECE7E2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700,
            }}>
              {(cl.full_name[0] ?? '?').toUpperCase()}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#20364A' }}>{cl.full_name}</div>
              <div style={{ fontSize: 11, color: '#4A5568', marginTop: 2 }}>
                {cl.phone}
                {cl.source && <span style={{ marginLeft: 8, color: '#8A9BB0' }}>· {cl.source}</span>}
              </div>
            </div>

            <span className={`pill ${STATUS_PILL[cl.status] ?? 'p-new'}`}>
              {STATUS_LABEL[cl.status] ?? cl.status}
            </span>

            <button onClick={() => openCart(cl)} style={{
              padding: '7px 16px', borderRadius: 8,
              background: tab === 0 ? '#3D7A5C' : '#20364A',
              color: '#fff', border: 'none',
              fontSize: 12, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>
              {tab === 0 ? 'Оформить абонемент →' : '+ Новый абонемент'}
            </button>
          </div>
        ))
      )}
    </div>
  )
}