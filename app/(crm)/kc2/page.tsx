'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Client, Subscription } from '@/types'

interface ClientWithSubs extends Client {
  subscriptions?: Subscription[]
}

const STATUS_PILL: Record<string, string> = {
  paid:             'p-paid',
  active:           'p-active',
  vip:              'p-vip',
  refund_requested: 'p-refund',
}
const STATUS_LABEL: Record<string, string> = {
  paid:             'Оплачен',
  active:           'Активный',
  vip:              'VIP',
  refund_requested: 'Запрос возврата',
}

const sCard: React.CSSProperties = {
  background: '#fff', border: '1px solid #DDD8D0',
  borderRadius: 14, overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(32,54,74,.06)',
}

export default function KC2Page() {
  const supabase = createClient()
  const [clients,   setClients]   = useState<ClientWithSubs[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        subscriptions (
          id, name, total_visits, used_visits, remaining_visits, status, created_at
        )
      `)
      .in('status', ['paid','active','vip','refund_requested'])
      .order('created_at', { ascending: false })
    if (!error) setClients((data ?? []) as ClientWithSubs[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const filtered = search.trim()
    ? clients.filter(c =>
        c.full_name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search))
    : clients

  const refundCount = clients.filter(c => c.status === 'refund_requested').length

  return (
    <div>
      {/* alert for refunds */}
      {refundCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 14px', borderRadius: 9, marginBottom: 12,
          background: '#FAEAEA', border: '1px solid #F0C0C0', fontSize: 11, color: '#B84040',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6.5" stroke="#B84040" strokeWidth="1.2"/>
            <path d="M7 4v4M7 9.5v.5" stroke="#B84040" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <span>Запросов на возврат: <strong>{refundCount}</strong></span>
          <Link href="/refunds" style={{ marginLeft: 'auto', color: '#B84040', fontSize: 10, fontWeight: 600, textDecoration: 'underline' }}>
            Перейти к возвратам →
          </Link>
        </div>
      )}

      {/* search + refresh bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#fff', border: '1px solid #DDD8D0', borderRadius: 12,
        padding: '10px 14px', marginBottom: 14,
        boxShadow: '0 1px 4px rgba(32,54,74,.05)',
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#8A9BB0" strokeWidth="1.3" strokeLinecap="round">
          <circle cx="6" cy="6" r="4.5"/><path d="M10 10l2.5 2.5"/>
        </svg>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по имени или телефону..."
          style={{
            flex: 1, border: 'none', outline: 'none',
            fontSize: 12, fontFamily: 'inherit', color: '#20364A',
            background: 'transparent',
          }}
        />
        <span style={{ fontSize: 10, color: '#8A9BB0', marginLeft: 4 }}>
          {filtered.length} клиентов
        </span>
        <button onClick={load} style={{
          padding: '5px 12px', borderRadius: 7,
          background: '#F5F2EE', color: '#20364A',
          border: '1px solid #DDD8D0', fontSize: 11, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>Обновить</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0', color: '#8A9BB0', fontSize: 12 }}>Загрузка...</div>
      ) : (
        <div style={sCard}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F5F2EE' }}>
                {['Клиент','Телефон','Абонемент','Прогресс','Статус','Дата',''].map(h => (
                  <th key={h} style={{
                    fontWeight: 700, color: '#8A9BB0', textAlign: 'left',
                    padding: '9px 14px', fontSize: 9,
                    letterSpacing: '.07em', textTransform: 'uppercase',
                    borderBottom: '1px solid #EDE8E1', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 36, color: '#8A9BB0', fontSize: 12 }}>
                    {search ? 'Ничего не найдено' : 'Клиентов в КЦ-2 пока нет. Перевод — через раздел Финансы.'}
                  </td>
                </tr>
              ) : filtered.map(cl => {
                const sub  = cl.subscriptions?.[0]
                const done = sub ? sub.used_visits : 0
                const tot  = sub ? sub.total_visits : 0
                const pct  = tot > 0 ? Math.round(done / tot * 100) : 0
                const isRefund = cl.status === 'refund_requested'

                return (
                  <tr key={cl.id}
                    style={{ borderBottom: '1px solid #F5F2EE', background: isRefund ? '#FFF5F5' : undefined }}
                    onMouseOver={e => !isRefund && (e.currentTarget.style.background = '#FAFAF8')}
                    onMouseOut={e  => !isRefund && (e.currentTarget.style.background = '')}>

                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: isRefund ? '#B84040' : '#C45C3C',
                          color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, flexShrink: 0,
                        }}>
                          {cl.full_name[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#20364A' }}>{cl.full_name}</div>
                          {cl.email && <div style={{ fontSize: 10, color: '#8A9BB0', marginTop: 1 }}>{cl.email}</div>}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '11px 14px', color: '#4A5568', fontSize: 11 }}>{cl.phone}</td>

                    <td style={{ padding: '11px 14px', fontSize: 11, color: '#4A5568' }}>
                      {sub?.name ?? <span style={{ color: '#C0C0C0' }}>—</span>}
                    </td>

                    <td style={{ padding: '11px 14px' }}>
                      {tot > 0 ? (
                        <div>
                          <div style={{ fontSize: 10, color: '#8A9BB0', marginBottom: 4 }}>{done}/{tot}</div>
                          <div style={{ height: 5, borderRadius: 3, background: '#EDE8E1', width: 80, overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 3, background: '#C45C3C', width: `${pct}%` }}/>
                          </div>
                        </div>
                      ) : <span style={{ color: '#C0C0C0', fontSize: 11 }}>—</span>}
                    </td>

                    <td style={{ padding: '11px 14px' }}>
                      <span className={`pill ${STATUS_PILL[cl.status] ?? 'p-active'}`}>
                        {STATUS_LABEL[cl.status] ?? cl.status}
                      </span>
                    </td>

                    <td style={{ padding: '11px 14px', color: '#8A9BB0', fontSize: 10, whiteSpace: 'nowrap' }}>
                      {new Date(cl.created_at).toLocaleDateString('ru')}
                    </td>

                    <td style={{ padding: '11px 14px' }}>
                      <Link href={`/kc2/${cl.id}`} style={{
                        padding: '5px 12px', borderRadius: 7,
                        background: '#F5F2EE', color: '#20364A',
                        border: '1px solid #DDD8D0', fontSize: 11,
                        textDecoration: 'none', whiteSpace: 'nowrap',
                        display: 'inline-block',
                      }}>
                        Открыть →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
