import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const VALID_ROLES = ['admin','kc1','kc2','finance','lawyer','reception','doctor'] as const
type ValidRole = (typeof VALID_ROLES)[number]

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env variables not configured.')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(req: NextRequest) {
  try {
    const { full_name, email, phone, role, temporary_password } = await req.json()

    if (!full_name?.trim())            return err('Введите имя.', 400)
    if (!email?.trim() || !email.includes('@')) return err('Некорректный email.', 400)
    if (!temporary_password || temporary_password.length < 8) return err('Пароль минимум 8 символов.', 400)
    if (!role || !VALID_ROLES.includes(role as ValidRole)) return err('Недопустимая роль.', 400)

    const supabase = getAdminClient()

    // Check for existing email
    const { data: existing } = await supabase.auth.admin.listUsers()
    if (existing?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase())) {
      return err(`Пользователь ${email} уже существует.`, 409)
    }

    // Create auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: temporary_password,
      email_confirm: true,
      user_metadata: { full_name: full_name.trim(), role },
    })
    if (authErr || !authData?.user) return err(authErr?.message ?? 'Ошибка создания пользователя.', 500)

    const userId = authData.user.id

    // Upsert profile with real field names
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id:        userId,
      full_name: full_name.trim(),
      email:     email.toLowerCase().trim(),
      phone:     phone?.trim() || null,
      role:      role as ValidRole,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    if (profileErr) {
      await supabase.auth.admin.deleteUser(userId)
      return err('Профиль не создан: ' + profileErr.message, 500)
    }

    return NextResponse.json({
      success: true,
      user: { id: userId, full_name: full_name.trim(), email: email.toLowerCase().trim(), role, phone: phone?.trim() || null, is_active: true },
      message: `Сотрудник ${full_name.trim()} создан.`,
    }, { status: 201 })

  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'Внутренняя ошибка.', 500)
  }
}

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
