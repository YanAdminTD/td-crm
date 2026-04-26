# T&D Clinic — Internal Platform

**Next.js 14 · TypeScript · Tailwind CSS · Supabase**

---

## Deploy in 5 minutes

### 1. Supabase setup

1. Create project → [supabase.com](https://supabase.com)
2. SQL Editor → paste `supabase/schema.sql` → Run
3. Settings → API → copy **Project URL** and **anon key** and **service_role key**

### 2. Vercel deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

Import this repo, then add **Environment Variables**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (secret) |

### 3. Local development

```bash
cp .env.example .env.local
# fill in your values
npm install
npm run dev
```

---

## Demo login (no Supabase needed)

| Email | Password | Role |
|---|---|---|
| admin@td-clinic.kz | admin123 | Администратор |
| kc1@td-clinic.kz | demo123 | КЦ-1 |
| kc2@td-clinic.kz | demo123 | КЦ-2 |
| finance@td-clinic.kz | demo123 | Финансист |
| lawyer@td-clinic.kz | demo123 | Юрист |
| rec@td-clinic.kz | demo123 | Рецепшен |
| doctor@td-clinic.kz | demo123 | Врач |

---

## Project structure

```
app/
├── (auth)/
│   ├── landing/page.tsx     # Premium landing page
│   └── login/page.tsx       # Login
├── (crm)/
│   ├── layout.tsx           # Sidebar + topbar
│   ├── dashboard/page.tsx   # Analytics (admin only)
│   ├── kc1/page.tsx         # Leads funnel
│   ├── kc2/page.tsx         # Subscribers base
│   ├── kc2/[id]/page.tsx    # Client card
│   ├── reception/page.tsx   # Check-in
│   ├── doctors/page.tsx     # Doctors
│   ├── finance/page.tsx     # Subscription cart
│   ├── lawyer/page.tsx      # Refunds
│   └── admin/page.tsx       # Staff management
├── api/
│   └── admin/create-employee/route.ts  # POST: create user
lib/
├── hooks/useAuth.tsx        # Auth context (demo + Supabase)
└── supabase/client.ts       # Browser client
middleware.ts                # Route protection
supabase/schema.sql          # Full DB schema + RLS
```
