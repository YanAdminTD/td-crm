'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Client, Subscription } from '@/types'

/* ── small style helpers ──────────────────────────────────── */
const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 14,
  border: '1px solid #DDD8D0',
  boxShadow: '0 2px 10px rgba(32,54,74,.07)',
}
const secTitle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: '#8A9BB0',
  textTransform: 'uppercase', letterSpacing: '.08em',
  marginBottom: 14,
}

function fmt(n: number) { return n.toLocaleString('ru') }

function downloadCSV(clients: Client[]) {
  const rows = [['ID','Имя','Телефон','Email','Статус','Создан']]
  clients.forEach(c => rows.push([c.id, c.full_name, c.phone, c.email ?? '', c.status, new Date(c.created_at).toLocaleDateString('ru')]))
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const b = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const u = URL.createObjectURL(b)
  const a = document.createElement('a')
  a.href = u
  a.download = 'TD_Clients_' + new Date().toISOString().substring(0, 10) + '.csv'
  a.click()
  URL.revokeObjectURL(u)
}

const STATUS_LABEL: Record<string, string> = {
  new_lead: 'Новый', contacted: 'Связались', consultation: 'Консультация',
  booked: 'Записан', paid: 'Оплачен', declined: 'Отказ',
  active: 'Активный', vip: 'VIP',
}
const STATUS_PILL: Record<string, string> = {
  new_lead: 'p-new', contacted: 'p-contact', consultation: 'p-consult',
  booked: 'p-done', paid: 'p-paid', declined: 'p-fail',
  active: 'p-active', vip: 'p-vip',
}

export default function DashboardPage() {
  const { role, loading } = useAuth()
  const router    = useRouter()
  const supabase  = createClient()

  const [dataLoading, setDataLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')

  /* stats */
  const [leadsCount,   setLeadsCount]   = useState(0)
  const [clientsCount, setClientsCount] = useState(0)
  const [subsCount,    setSubsCount]    = useState(0)

  /* table data */
  const [recentLeads,   setRecentLeads]   = useState<Client[]>([])
  const [allClients,    setAllClients]    = useState<Client[]>([])
  const [recentSubs,    setRecentSubs]    = useState<(Subscription & { clients?: Client })[]>([])

  useEffect(() => {
    if (!loading && role !== 'admin') router.replace('/kc1')
  }, [role, loading, router])

  const loadData = useCallback(async () => {
    setDataLoading(true)

    const [leadsRes, clientsRes, subsRes, recentLeadsRes, allClientsRes, subsListRes] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true })
        .in('status', ['new_lead','contacted','consultation','booked']),
      supabase.from('clients').select('id', { count: 'exact', head: true })
        .in('status', ['paid','active','vip']),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }),
      supabase.from('clients').select('*')
        .in('status', ['new_lead','contacted','consultation','booked'])
        .order('created_at', { ascending: false }).limit(8),
      supabase.from('clients').select('*')
        .in('status', ['paid','active','vip'])
        .order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*, clients(full_name, phone)')
        .eq('status', 'active').order('created_at', { ascending: false }).limit(8),
    ])

    setLeadsCount(leadsRes.count ?? 0)
    setClientsCount(clientsRes.count ?? 0)
    setSubsCount(subsRes.count ?? 0)
    setRecentLeads((recentLeadsRes.data ?? []) as Client[])
    setAllClients((allClientsRes.data ?? []) as Client[])
    setRecentSubs((subsListRes.data ?? []) as any)
    setDataLoading(false)
  }, [supabase])

  useEffect(() => { if (role === 'admin') loadData() }, [role, loadData])

  if (loading || role !== 'admin') return null

  const METRICS = [
    { label: 'Лиды КЦ-1',       value: fmt(leadsCount),   delta: 'Ожидают обработки', accentColor: '#3A6EA5' },
    { label: 'Клиенты КЦ-2',    value: fmt(clientsCount), delta: 'С абонементами',      accentColor: '#3D7A5C' },
    { label: 'Активных абон.',   value: fmt(subsCount),    delta: 'Действующих',         accentColor: '#9A6B1A' },
    { label: 'База клиентов',    value: fmt(allClients.length), delta: 'Всего в системе', accentColor: '#C45C3C' },
  ]

  return (
    <div style={{ fontFamily: "'Open Sans', system-ui, sans-serif" }}>

      {/* ── Filter bar ──────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        background: '#fff', border: '1px solid #DDD8D0', borderRadius: 12,
        padding: '10px 16px', marginBottom: 18,
        boxShadow: '0 1px 4px rgba(32,54,74,.05)',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#8A9BB0', letterSpacing: '.07em', textTransform: 'uppercase' }}>Период:</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          style={{ padding: '5px 9px', borderRadius: 7, border: '1px solid #DDD8D0', fontSize: 11, fontFamily: 'inherit', background: '#F5F2EE', color: '#20364A', outline: 'none' }}/>
        <span style={{ fontSize: 10, color: '#8A9BB0' }}>—</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          style={{ padding: '5px 9px', borderRadius: 7, border: '1px solid #DDD8D0', fontSize: 11, fontFamily: 'inherit', background: '#F5F2EE', color: '#20364A', outline: 'none' }}/>
        <button onClick={loadData} style={{
          padding: '6px 14px', borderRadius: 8, background: '#C45C3C', color: '#fff', border: 'none',
          fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
        }}>Обновить</button>

        <button onClick={() => downloadCSV(allClients)} style={{
          marginLeft: 'auto',
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '7px 16px', borderRadius: 8,
          background: '#20364A', color: '#ECE7E2', border: 'none',
          fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v7M3.5 5.5L6 8l2.5-2.5M2 10h8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Скачать базу клиентов
        </button>
      </div>

      {dataLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#8A9BB0', fontSize: 13 }}>Загрузка данных...</div>
      ) : (
        <>
          {/* ── Metric cards ─────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
            {METRICS.map((m, i) => (
              <div key={i} style={{
                ...card,
                padding: '18px 18px 16px',
                position: 'relative', overflow: 'hidden',
              }}>
                {/* left accent stripe */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: m.accentColor, borderRadius: '14px 0 0 14px' }} />
                <div style={{ paddingLeft: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#8A9BB0', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>{m.label}</div>
                  <div style={{ fontFamily: 'Forum, serif', fontSize: 28, color: '#20364A', lineHeight: 1 }}>{m.value}</div>
                  <div style={{ fontSize: 10, color: '#8A9BB0', marginTop: 4 }}>{m.delta}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Two column ───────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

            {/* Recent leads */}
            <div style={{ ...card, padding: 18 }}>
              <div style={secTitle}>Последние лиды</div>
              {recentLeads.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#8A9BB0', fontSize: 11 }}>Нет лидов</div>
              ) : recentLeads.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F5F2EE' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#20364A', color: '#ECE7E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {c.full_name[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 12, color: '#20364A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.full_name}</div>
                    <div style={{ fontSize: 10, color: '#8A9BB0' }}>{c.phone}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                    <span className={`pill ${STATUS_PILL[c.status] ?? 'p-new'}`}>{STATUS_LABEL[c.status] ?? c.status}</span>
                    <span style={{ fontSize: 9, color: '#8A9BB0' }}>{c.source ?? '—'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Active subscriptions */}
            <div style={{ ...card, padding: 18 }}>
              <div style={secTitle}>Активные абонементы</div>
              {recentSubs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#8A9BB0', fontSize: 11 }}>Нет активных абонементов</div>
              ) : recentSubs.map(s => {
                const pct = s.total_visits > 0 ? Math.round((s.used_visits / s.total_visits) * 100) : 0
                return (
                  <div key={s.id} style={{ padding: '8px 0', borderBottom: '1px solid #F5F2EE' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 12, color: '#20364A' }}>
                          {(s as any).clients?.full_name ?? '—'}
                        </div>
                        <div style={{ fontSize: 10, color: '#8A9BB0' }}>{s.name}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#20364A' }}>{s.used_visits}/{s.total_visits}</div>
                        <div style={{ fontSize: 9, color: '#8A9BB0' }}>визитов</div>
                      </div>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: '#EDE8E1', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 2, background: '#C45C3C', width: `${pct}%`, transition: 'width .3s' }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── All clients table ───────────────────── */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={secTitle}>База клиентов КЦ-2 ({allClients.length})</div>
            </div>
            {allClients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#8A9BB0', fontSize: 12 }}>Клиентов пока нет</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#F5F2EE' }}>
                    {['Клиент','Телефон','Email','Источник','Статус','Создан'].map(h => (
                      <th key={h} style={{ fontWeight: 600, color: '#8A9BB0', textAlign: 'left', padding: '7px 12px', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', borderBottom: '1px solid #EDE8E1', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allClients.slice(0, 30).map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #F5F2EE' }}
                      onMouseOver={e => (e.currentTarget.style.background = '#FAFAF8')}
                      onMouseOut={e  => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '9px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#C45C3C', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                            {c.full_name[0].toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 500, color: '#20364A' }}>{c.full_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '9px 12px', color: '#4A5568', fontSize: 11 }}>{c.phone}</td>
                      <td style={{ padding: '9px 12px', color: '#4A5568', fontSize: 11 }}>{c.email ?? '—'}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#F5F2EE', color: '#4A5568', border: '1px solid #DDD8D0' }}>
                          {c.source ?? '—'}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <span className={`pill ${STATUS_PILL[c.status] ?? 'p-active'}`}>
                          {STATUS_LABEL[c.status] ?? c.status}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px', color: '#8A9BB0', fontSize: 10, whiteSpace: 'nowrap' }}>
                        {new Date(c.created_at).toLocaleDateString('ru')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
