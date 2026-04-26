'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import Link from 'next/link'

interface Doctor {
  id: string; name: string; spec: string; active: boolean
  svcs: string[]
  sch: { mon:string; tue:string; wed:string; thu:string; fri:string }
}

const INIT_DOCTORS: Doctor[] = [
  {
    id: 'd1', name: 'Карина Алматова', spec: 'Инъекционист', active: true,
    svcs: ['Ботокс — лоб', 'Ботокс — межбровье', 'Контурная пластика — губы', 'Контурная пластика — скулы'],
    sch: { mon: '10:00–18:00', tue: '10:00–18:00', wed: '—', thu: '10:00–18:00', fri: '10:00–17:00' },
  },
  {
    id: 'd2', name: 'Ольга Михайлова', spec: 'Лазерный специалист', active: true,
    svcs: ['Лазерное омоложение', 'Лазерная эпиляция', 'Биоревитализация'],
    sch: { mon: '09:00–17:00', tue: '—', wed: '09:00–17:00', thu: '09:00–17:00', fri: '09:00–16:00' },
  },
  {
    id: 'd3', name: 'Диана Сергеева', spec: 'Дерматолог-косметолог', active: true,
    svcs: ['Мезотерапия — лицо', 'Мезотерапия — волосы', 'Чистка лица', 'Пилинг'],
    sch: { mon: '11:00–19:00', tue: '11:00–19:00', wed: '11:00–19:00', thu: '—', fri: '11:00–18:00' },
  },
]

const DAYS: [string, keyof Doctor['sch']][] = [['Пн','mon'],['Вт','tue'],['Ср','wed'],['Чт','thu'],['Пт','fri']]

export default function DoctorsPage() {
  const { role } = useAuth()
  const [doctors] = useState(INIT_DOCTORS)
  const isAdmin = role === 'admin'

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <div className="text-[11px]" style={{ color: '#4A5568' }}>
          {doctors.filter(d => d.active).length} активных врачей
        </div>
        {isAdmin && (
          <Link
            href="/doctors/new"
            className="px-3 py-1.5 rounded-lg text-white text-[11px] font-medium"
            style={{ background: '#B8563B', fontFamily: 'inherit' }}
          >
            + Добавить врача
          </Link>
        )}
      </div>

      {doctors.map(d => (
        <div key={d.id} className="td-card">
          <div className="flex items-start gap-3">
            <div className="td-av td-av-olive" style={{ width: 40, height: 40, fontSize: 14, flexShrink: 0 }}>
              {d.name[0]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <div className="font-forum text-[14px]" style={{ color: '#1C3453' }}>{d.name}</div>
                <span className={`pill ${d.active ? 'pill-active' : 'pill-noshow'}`}>
                  {d.active ? 'Активен' : 'Неактивен'}
                </span>
              </div>
              <div className="text-[10px] mb-2" style={{ color: '#4A5568' }}>{d.spec}</div>
              <div className="flex flex-wrap gap-1 mb-3">
                {d.svcs.map(s => <span key={s} className="td-tag">{s}</span>)}
              </div>
              <div className="grid grid-cols-5 gap-1">
                {DAYS.map(([l, k]) => (
                  <div
                    key={k}
                    className="rounded-lg p-1.5 text-center"
                    style={{ background: d.sch[k] === '—' ? '#F5F2EE' : '#E8F4EE' }}
                  >
                    <div className="text-[8px]" style={{ color: '#8A9BB0' }}>{l}</div>
                    <div
                      className="text-[8px] font-semibold"
                      style={{ color: d.sch[k] === '—' ? '#8A9BB0' : '#3D7A5C' }}
                    >
                      {d.sch[k]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-semibold text-[14px]" style={{ color: '#1C3453' }}>2/4</div>
              <div className="text-[9px]" style={{ color: '#8A9BB0' }}>сегодня</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
