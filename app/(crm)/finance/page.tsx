'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Client, Service, Subscription } from '@/types'

const CATS_ORDER = ['Инъекции', 'Мезо', 'Лазер', 'Уход', 'Другое']

const CHECK = (
  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
    <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export default function FinancePage() {
  const { profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab]           = useState(0)
  const [clients, setClients]   = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading]   = useState(true)

  // Cart state
  const [cartFor, setCartFor]   = useState<Client | null>(null)
  const [cart, setCart]         = useState<string[]>([])
  const [abName, setAbName]     = useState('')
  const [abTotal, setAbTotal]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState('')

  // Load KC-1 (status: new/contacted/consultation/booked)
  const loadKC1 = useCallback(async () => {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .in('status', ['new','contacted','consultation','booked'])
      .order('created_at', { ascending: false })
    return (data ?? []) as Client[]
  }, [supabase])

  // Load KC-2 (status: paid/active/vip)
  const loadKC2 = useCallback(async () => {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .in('status', ['paid','active','vip'])
      .order('created_at', { ascending: false })
    return (data ?? []) as Client[]
  }, [supabase])

  const loadServices = useCallback(async () => {
    const { data } = await supabase
      .from('services')
      .select('*, service_categories(name)')
      .eq('is_active', true)
      .order('name')
    return (data ?? []) as Service[]
  }, [supabase])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [kc1, kc2, svcs] = await Promise.all([loadKC1(), loadKC2(), loadServices()])
      // tab 0 = kc1, tab 1 = kc2
      setClients(tab === 0 ? kc1 : kc2)
      setServices(svcs)
      setLoading(false)
    }
    load()
  }, [tab, loadKC1, loadKC2, loadServices])

  const openCart = (client: Client) => {
    setCartFor(client)
    setCart([])
    setAbName('')
    setAbTotal('')
    setSaveError('')
  }

  const toggleCart = (id: string) => {
    setCart(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const listTotal = cart.reduce((s, id) => {
    const svc = services.find(x => x.id === id)
    return s + (svc?.price ?? 0)
  }, 0)

  const saveCart = async () => {
    if (!cartFor) return
    if (!abName.trim()) { setSaveError('Введите название абонемента.'); return }
    if (!cart.length)   { setSaveError('Выберите хотя бы одну процедуру.'); return }
    const total = parseInt(abTotal) || listTotal
    if (!total)         { setSaveError('Введите сумму.'); return }

    setSaving(true)
    setSaveError('')

    // Create subscription
    const { data: sub, error: subErr } = await supabase
      .from('subscriptions')
      .insert({
        client_id:        cartFor.id,
        name:             abName.trim(),
        total_visits:     cart.length,
        used_visits:      0,
        remaining_visits: cart.length,
        status:           'active',
        sold_by:          profile?.id ?? null,
        created_at:       new Date().toISOString(),
        updated_at:       new Date().toISOString(),
      })
      .select()
      .single()

    if (subErr || !sub) {
      setSaveError(subErr?.message ?? 'Ошибка создания абонемента.')
      setSaving(false)
      return
    }

    // Create subscription_services rows
    const rows = cart.map(svcId => ({
      subscription_id: sub.id,
      service_id:      svcId,
      allowed_visits:  1,
      used_visits:     0,
      created_at:      new Date().toISOString(),
    }))
    await supabase.from('subscription_services').insert(rows)

    // Update client status to 'paid'
    await supabase
      .from('clients')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', cartFor.id)

    setCartFor(null)
    setCart([])
    router.refresh()
    // Reload table
    const updated = tab === 0 ? await loadKC1() : await loadKC2()
    setClients(updated)
    setSaving(false)
  }

  const STATUS_LABEL: Record<string, string> = {
    new:'Новый', contacted:'Связались', consultation:'Консультация',
    booked:'Записан', paid:'Оплачен', active:'Активный', vip:'VIP',
  }
  const STATUS_PILL: Record<string, string> = {
    new:'p-new', contacted:'p-contact', consultation:'p-consult',
    booked:'p-done', paid:'p-paid', active:'p-active', vip:'p-vip',
  }

  // ── CART VIEW ──────────────────────────────────────────
  if (cartFor) {
    const cats = CATS_ORDER.filter(c => services.some(s => (s as any).service_categories?.name === c || (s.category_id && !s.id.startsWith('_'))))
    // group by category name from join
    const catMap: Record<string, Service[]> = {}
    services.forEach(s => {
      const cat = (s as any).service_categories?.name ?? 'Другое'
      if (!catMap[cat]) catMap[cat] = []
      catMap[cat].push(s)
    })
    const catKeys = Object.keys(catMap).sort()

    return (
      <div>
        <button className="btn mb-4" onClick={() => setCartFor(null)} style={{ cursor:'pointer', fontFamily:'inherit' }}>← Назад</button>
        <div style={{ fontFamily:'Forum, serif', fontSize:18, color:'#1C3453', marginBottom:14 }}>
          Оформление абонемента — {cartFor.full_name}
        </div>

        {saveError && (
          <div className="mb-3 px-3 py-2 rounded-lg text-[11px]"
            style={{ background:'#FAEAEA', border:'1px solid #F0C0C0', color:'#B84040' }}>
            {saveError}
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:14, alignItems:'start' }}>
          {/* Left: service picker */}
          <div>
            {catKeys.map(cat => (
              <div key={cat} className="td-card mb-3">
                <div className="td-card-title">{cat}</div>
                {catMap[cat].map(s => {
                  const sel = cart.includes(s.id)
                  return (
                    <div key={s.id}
                      onClick={() => toggleCart(s.id)}
                      style={{
                        display:'flex', alignItems:'center', gap:9,
                        padding:'9px 11px', borderRadius:9, marginBottom:5,
                        cursor:'pointer',
                        border:`1px solid ${sel?'#9FD4B8':'#DDD8D0'}`,
                        background: sel?'#E8F4EE':'#fff',
                      }}>
                      <div style={{
                        width:15, height:15, borderRadius:4, flexShrink:0,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        background: sel?'#3D7A5C':'transparent',
                        border:`1.5px solid ${sel?'#3D7A5C':'#DDD8D0'}`,
                      }}>{sel&&CHECK}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:500 }}>{s.name}</div>
                        {s.duration_minutes && <div style={{ fontSize:10, color:'#8A9BB0' }}>{s.duration_minutes} мин</div>}
                      </div>
                      <div style={{ fontSize:12, fontWeight:600, color:sel?'#3D7A5C':'#1C3453' }}>
                        {s.price.toLocaleString('ru')} ₸
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
            {catKeys.length === 0 && (
              <div className="td-card text-center py-8" style={{ color:'#8A9BB0', fontSize:11 }}>
                Нет активных услуг. Добавьте услуги в разделе Управление.
              </div>
            )}
          </div>

          {/* Right: cart */}
          <div>
            <div className="td-card" style={{ position:'sticky', top:0 }}>
              <div style={{ fontFamily:'Forum, serif', fontSize:14, color:'#1C3453', marginBottom:12 }}>Корзина</div>
              {cart.length === 0 ? (
                <div style={{ textAlign:'center', padding:'20px 0', color:'#8A9BB0', fontSize:12 }}>
                  ← Выберите процедуры
                </div>
              ) : (
                <>
                  {cart.map(id => {
                    const s = services.find(x => x.id === id)
                    if (!s) return null
                    return (
                      <div key={id} style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 9px', background:'#F5F2EE', borderRadius:8, marginBottom:4, border:'1px solid #DDD8D0' }}>
                        <div style={{ flex:1, fontSize:11, fontWeight:500 }}>{s.name}</div>
                        <div style={{ fontSize:11, color:'#4A5568', marginRight:6 }}>{s.price.toLocaleString('ru')} ₸</div>
                        <span onClick={() => toggleCart(id)} style={{ cursor:'pointer', color:'#8A9BB0', fontSize:15, lineHeight:1 }}>×</span>
                      </div>
                    )
                  })}
                  <div style={{ display:'flex', justifyContent:'space-between', padding:'9px 0 5px', borderTop:'1px solid #EDE8E1', marginTop:6, fontSize:11, color:'#4A5568' }}>
                    <span>Прайс ({cart.length} проц.)</span>
                    <span>{listTotal.toLocaleString('ru')} ₸</span>
                  </div>
                  <div className="frow mt-3">
                    <label className="td-label">Название абонемента *</label>
                    <input className="td-input" value={abName} onChange={e=>setAbName(e.target.value)} placeholder="Инъекционный курс"/>
                  </div>
                  <div className="frow">
                    <label className="td-label">Итоговая сумма (₸) *</label>
                    <input className="td-input" type="number" value={abTotal} onChange={e=>setAbTotal(e.target.value)} placeholder={String(listTotal)}/>
                  </div>
                  <div style={{ fontSize:9, color:'#8A9BB0', marginBottom:10 }}>
                    Финансист вводит финальную сумму с учётом скидок.
                  </div>
                  <button className="btn btn-green" style={{ width:'100%', padding:'9px', fontSize:12, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit', opacity:saving?.65:1 }}
                    onClick={saveCart} disabled={saving}>
                    {saving ? 'Сохранение...' : 'Оформить абонемент ✓'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── MAIN FINANCE VIEW ──────────────────────────────────
  return (
    <div>
      <div className="flex mb-4" style={{ borderBottom:'1px solid #DDD8D0' }}>
        {['Перевод КЦ-1 → КЦ-2', 'Доп. абонемент (КЦ-2)'].map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            padding:'7px 15px', fontSize:11, fontWeight:500,
            cursor:'pointer', background:'none', border:'none',
            borderBottom:`2px solid ${tab===i?'#B8563B':'transparent'}`,
            marginBottom:-1, color:tab===i?'#B8563B':'#8A9BB0', fontFamily:'inherit',
          }}>{t}</button>
        ))}
      </div>

      <div className="td-infobar">
        {tab === 0
          ? 'Выберите лида из КЦ-1 и оформите абонемент. После оплаты клиент перейдёт в базу КЦ-2.'
          : 'Оформите новый или дополнительный абонемент для существующего клиента.'}
      </div>

      {loading ? (
        <div className="text-center py-10" style={{ color:'#8A9BB0', fontSize:11 }}>Загрузка...</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-10" style={{ color:'#8A9BB0', fontSize:11 }}>
          {tab === 0 ? 'Нет лидов для перевода' : 'Нет клиентов в КЦ-2'}
        </div>
      ) : (
        clients.map(cl => (
          <div key={cl.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', border:'1px solid #DDD8D0', borderRadius:10, marginBottom:7, background:'#fff' }}>
            <div className="td-av td-av-navy" style={{ width:30, height:30, fontSize:11 }}>{cl.full_name[0]}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:500, fontSize:12 }}>{cl.full_name}</div>
              <div style={{ fontSize:10, color:'#4A5568' }}>{cl.phone}{cl.source ? ` · ${cl.source}` : ''}</div>
            </div>
            <span className={`pill ${STATUS_PILL[cl.status]??'p-new'}`}>{STATUS_LABEL[cl.status]??cl.status}</span>
            <button className="btn btn-green" onClick={() => openCart(cl)} style={{ cursor:'pointer', fontFamily:'inherit' }}>
              {tab === 0 ? 'Оформить абонемент →' : '+ Новый абонемент'}
            </button>
          </div>
        ))
      )}
    </div>
  )
}
