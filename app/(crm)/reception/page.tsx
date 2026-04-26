'use client'

import { useState } from 'react'

interface Appointment {
  id: string; name: string; kc: string
  svc: string; time: string; doc: string
  arrived: boolean; inDoc: boolean; done: boolean
}

const INIT: Appointment[] = [
  { id:'ЗП-501', name:'Айгерим Нурланова', kc:'КЦ-2', svc:'Ботокс — лоб',       time:'10:00', doc:'Карина А.',  arrived:true,  inDoc:true,  done:true  },
  { id:'ЗП-502', name:'Жанна Бекова',      kc:'КЦ-2', svc:'Лазерное омоложение', time:'11:30', doc:'Ольга М.',   arrived:false, inDoc:false, done:false },
  { id:'ЗП-503', name:'Светлана Ковалева', kc:'КЦ-2', svc:'Мезотерапия',         time:'14:00', doc:'Диана С.',   arrived:false, inDoc:false, done:false },
  { id:'ЗП-504', name:'Мадина Касымова',   kc:'КЦ-1', svc:'Мезотерапия',         time:'15:30', doc:'Диана С.',   arrived:false, inDoc:false, done:false },
]

export default function ReceptionPage() {
  const [appts, setAppts] = useState(INIT)

  const toggle = (i: number, field: 'arrived' | 'inDoc') => {
    setAppts(prev => prev.map((a, idx) => {
      if (idx !== i) return a
      if (field === 'arrived') {
        return { ...a, arrived: !a.arrived, inDoc: !a.arrived ? a.inDoc : false }
      }
      return a.arrived ? { ...a, inDoc: !a.inDoc } : a
    }))
  }

  return (
    <div>
      <div className="td-infobar">
        Рецепшен отмечает приход клиента и переход к врачу.
        Врач самостоятельно отмечает выполнение процедуры в разделе «Врачи».
      </div>

      <div className="td-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="td-table">
          <thead>
            <tr>
              <th style={{ padding: '8px 10px' }}>№</th>
              <th>Клиент</th><th>КЦ</th><th>Услуга</th>
              <th>Время</th><th>Врач</th>
              <th>Пришёл?</th><th>У врача?</th>
            </tr>
          </thead>
          <tbody>
            {appts.map((a, i) => (
              <tr key={a.id}>
                <td style={{ padding: '8px 10px', fontSize: 9, color: '#8A9BB0' }}>{a.id}</td>
                <td className="font-medium">{a.name.split(' ')[0]}</td>
                <td><span className="td-tag">{a.kc}</span></td>
                <td style={{ fontSize: 10, color: '#4A5568' }}>{a.svc}</td>
                <td className="font-semibold">{a.time}</td>
                <td style={{ fontSize: 10, color: '#4A5568' }}>{a.doc}</td>
                <td>
                  <button
                    onClick={() => toggle(i, 'arrived')}
                    className="btn btn-sm"
                    style={{
                      background: a.arrived ? '#3D7A5C' : '#F5F2EE',
                      color: a.arrived ? '#fff' : '#1C3453',
                      borderColor: a.arrived ? '#3D7A5C' : '#DDD8D0',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {a.arrived ? 'Пришёл ✓' : 'Отметить'}
                  </button>
                </td>
                <td>
                  <button
                    onClick={() => toggle(i, 'inDoc')}
                    disabled={!a.arrived}
                    className="btn btn-sm"
                    style={{
                      background: a.inDoc ? '#2A5F8F' : '#F5F2EE',
                      color: a.inDoc ? '#fff' : '#1C3453',
                      borderColor: a.inDoc ? '#2A5F8F' : '#DDD8D0',
                      opacity: a.arrived ? 1 : 0.4,
                      cursor: a.arrived ? 'pointer' : 'default',
                      fontFamily: 'inherit',
                    }}
                  >
                    {a.inDoc ? 'У врача ✓' : 'Зашёл'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
