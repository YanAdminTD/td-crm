"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"

const STATUS_LABELS: any = {
  new_lead: "Новый",
  in_progress: "Связался",
  sold: "Продан",
  active_client: "Клиент",
  lost: "Потерян",
  refund_requested: "Запрос возврата",
  refunded: "Возврат",
}

export default function KC1Page() {
  const [clients, setClients] = useState<any[]>([])
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    source: "",
    comment: "",
    visit_at: "",
  })

  async function fetchClients() {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error) setClients(data || [])
  }

  async function createLead() {
    const { error } = await supabase.from("clients").insert({
      full_name: form.full_name,
      phone: form.phone,
      source: form.source,
      comment: form.comment,
      status: "new_lead", // 🔥 ВАЖНО
      visit_at: form.visit_at
        ? new Date(form.visit_at).toISOString()
        : null,
    })

    if (!error) {
      setForm({
        full_name: "",
        phone: "",
        source: "",
        comment: "",
        visit_at: "",
      })
      fetchClients()
    } else {
      alert(error.message)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  return (
    <div style={{ padding: 20 }}>
      <h2>КЦ-1 — Лиды</h2>

      {/* ФОРМА */}
      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="Имя"
          value={form.full_name}
          onChange={(e) =>
            setForm({ ...form, full_name: e.target.value })
          }
        />
        <input
          placeholder="Телефон"
          value={form.phone}
          onChange={(e) =>
            setForm({ ...form, phone: e.target.value })
          }
        />
        <input
          placeholder="Источник"
          value={form.source}
          onChange={(e) =>
            setForm({ ...form, source: e.target.value })
          }
        />
        <input
          type="datetime-local"
          value={form.visit_at}
          onChange={(e) =>
            setForm({ ...form, visit_at: e.target.value })
          }
        />
        <textarea
          placeholder="Комментарий"
          value={form.comment}
          onChange={(e) =>
            setForm({ ...form, comment: e.target.value })
          }
        />
        <button onClick={createLead}>Создать лид</button>
      </div>

      {/* ТАБЛИЦА */}
      <table border={1} cellPadding={10}>
        <thead>
          <tr>
            <th>Имя</th>
            <th>Телефон</th>
            <th>Источник</th>
            <th>Статус</th>
            <th>Дата визита</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id}>
              <td>{c.full_name}</td>
              <td>{c.phone}</td>
              <td>{c.source}</td>
              <td>{STATUS_LABELS[c.status]}</td>
              <td>
                {c.visit_at
                  ? new Date(c.visit_at).toLocaleString()
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}