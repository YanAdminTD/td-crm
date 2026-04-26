'use client'

import Link from 'next/link'

const REFUNDS = [
  {
    id: 'КЛ-203',
    name: 'Светлана Ковалева',
    sub: 'Мезо-курс',
    paid: 63000,
    note: 'Недовольна результатом процедуры №1. Требует полный возврат средств.',
    approved: null,
  },
]

const RESOLVED = [
  {
    id: 'КЛ-100',
    name: 'Марина Петрова',
    sub: 'Уход-пакет',
    approved: false,
    note: '[Юрист] Клиент остаётся, возврат отменён. Получена компенсация в виде доп. процедуры.',
  },
]

function fmt(n: number) { return n.toLocaleString('ru') }

export default function LawyerPage() {
  return (
    <div>
      <div className="td-infobar">
        Юрист пишет примечание по каждому возврату в карточке клиента.{' '}
        <strong>Решение принимает только администратор.</strong>
      </div>

      <div className="td-card">
        <div className="td-card-title">
          Открытые возвраты
          {REFUNDS.length > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-bold"
              style={{ background: '#FAEAEA', color: '#B84040' }}
            >
              {REFUNDS.length}
            </span>
          )}
        </div>

        {REFUNDS.length === 0 ? (
          <div className="text-center py-6" style={{ color: '#8A9BB0', fontSize: 11 }}>
            Открытых возвратов нет
          </div>
        ) : (
          REFUNDS.map(r => (
            <Link
              key={r.id}
              href={`/kc2/${r.id}`}
              className="flex items-start gap-3 p-3 rounded-xl border mb-2 block transition-colors hover:border-[#F0C8C8]"
              style={{ background: '#FFF8F8', borderColor: '#F0C8C8' }}
            >
              <div className="td-av td-av-terra" style={{ width: 28, height: 28, fontSize: 10 }}>{r.name[0]}</div>
              <div className="flex-1">
                <div className="font-semibold text-[12px]">{r.name}</div>
                <div className="text-[10px] mt-0.5" style={{ color: '#4A5568' }}>
                  {r.sub} · {fmt(r.paid)} ₸
                </div>
                {r.note ? (
                  <div className="text-[10px] mt-1.5 italic" style={{ color: '#B84040' }}>
                    "{r.note.substring(0, 80)}{r.note.length > 80 ? '...' : ''}"
                  </div>
                ) : (
                  <div className="text-[10px] mt-1.5" style={{ color: '#8A9BB0' }}>
                    Примечание не добавлено — откройте карточку
                  </div>
                )}
              </div>
              <span className="text-[10px] font-medium flex-shrink-0" style={{ color: '#B8563B' }}>
                Открыть →
              </span>
            </Link>
          ))
        )}
      </div>

      {RESOLVED.length > 0 && (
        <div className="td-card">
          <div className="td-card-title">Решённые администратором</div>
          {RESOLVED.map(r => (
            <Link
              key={r.id}
              href={`/kc2/${r.id}`}
              className="flex items-center gap-3 p-2.5 rounded-lg border mb-1.5 block"
              style={{ borderColor: '#DDD8D0' }}
            >
              <div className="td-av td-av-olive" style={{ width: 24, height: 24, fontSize: 9 }}>{r.name[0]}</div>
              <div className="flex-1">
                <div className="font-medium text-[11px]">{r.name}</div>
                <div className="text-[9px] mt-0.5" style={{ color: '#8A9BB0' }}>
                  {r.note.substring(0, 60)}...
                </div>
              </div>
              <span className={`pill ${r.approved ? 'pill-resolved' : 'pill-active'}`}>
                {r.approved ? 'Возврат подтверждён' : 'Клиент остался'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
