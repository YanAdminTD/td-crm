-- ============================================================
-- T&D Clinic CRM — Supabase Schema
-- Run this in Supabase SQL Editor (supabase.com)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── ENUMS ─────────────────────────────────────────────────
create type user_role as enum ('admin','kc1','kc2','finance','lawyer','reception','doctor');
create type lead_status as enum ('new','contact','consult','done','paid','fail');
create type client_status as enum ('active','vip','pending');
create type service_cat as enum ('Инъекции','Мезо','Лазер','Уход','Другое');

-- ── PROFILES ──────────────────────────────────────────────
create table profiles (
  id         uuid references auth.users on delete cascade primary key,
  full_name  text not null,
  role       user_role not null default 'kc1',
  phone      text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Новый сотрудник'),
    coalesce(new.raw_user_meta_data->>'role', 'kc1')::user_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── SERVICES ──────────────────────────────────────────────
create table services (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  category   service_cat not null default 'Другое',
  price      integer not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── DOCTORS ───────────────────────────────────────────────
create table doctors (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  spec       text not null,
  schedule   jsonb not null default '{"mon":"—","tue":"—","wed":"—","thu":"—","fri":"—"}',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table doctor_services (
  doctor_id  uuid references doctors on delete cascade,
  service_id uuid references services on delete cascade,
  primary key (doctor_id, service_id)
);

-- ── LEADS (KC-1) ──────────────────────────────────────────
create table leads (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  phone       text not null,
  source      text not null default 'Instagram',
  status      lead_status not null default 'new',
  service_id  uuid references services,
  slot_date   date,
  slot_time   time,
  comment     text,
  assigned_to uuid references profiles,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── CLIENTS (KC-2) ────────────────────────────────────────
create table clients (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  phone            text not null,
  status           client_status not null default 'active',
  lead_id          uuid references leads,
  note             text not null default '',
  refund           boolean not null default false,
  refund_note      text not null default '',
  refund_approved  boolean,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── SUBSCRIPTIONS ─────────────────────────────────────────
create table subscriptions (
  id         uuid primary key default uuid_generate_v4(),
  client_id  uuid references clients on delete cascade not null,
  name       text not null,
  paid       integer not null,
  created_at timestamptz not null default now()
);

create table subscription_procedures (
  id              uuid primary key default uuid_generate_v4(),
  subscription_id uuid references subscriptions on delete cascade not null,
  service_id      uuid references services not null,
  done            boolean not null default false,
  done_date       date,
  done_by         uuid references doctors,
  sort_order      integer not null default 0
);

-- ── APPOINTMENTS (Reception) ─────────────────────────────
create table appointments (
  id          uuid primary key default uuid_generate_v4(),
  client_id   uuid references clients,
  lead_id     uuid references leads,
  service_id  uuid references services not null,
  doctor_id   uuid references doctors,
  appt_date   date not null default current_date,
  appt_time   time not null,
  arrived     boolean not null default false,
  in_doctor   boolean not null default false,
  proc_done   boolean not null default false,
  kc_type     text not null default 'КЦ-1',
  created_at  timestamptz not null default now()
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────
alter table profiles                enable row level security;
alter table services                enable row level security;
alter table doctors                 enable row level security;
alter table doctor_services         enable row level security;
alter table leads                   enable row level security;
alter table clients                 enable row level security;
alter table subscriptions           enable row level security;
alter table subscription_procedures enable row level security;
alter table appointments            enable row level security;

create or replace function get_my_role()
returns user_role language sql security definer stable as $$
  select role from profiles where id = auth.uid()
$$;

-- Profiles
create policy "profiles_read"        on profiles for select to authenticated using (true);
create policy "profiles_update_self" on profiles for update to authenticated using (id = auth.uid());
create policy "profiles_admin"       on profiles for all    to authenticated using (get_my_role() = 'admin') with check (get_my_role() = 'admin');

-- Services & Doctors (everyone reads, admin manages)
create policy "services_read"  on services for select to authenticated using (true);
create policy "services_admin" on services for all    to authenticated using (get_my_role() = 'admin') with check (get_my_role() = 'admin');
create policy "doctors_read"   on doctors  for select to authenticated using (true);
create policy "doctors_admin"  on doctors  for all    to authenticated using (get_my_role() = 'admin') with check (get_my_role() = 'admin');
create policy "doc_svc_read"   on doctor_services for select to authenticated using (true);
create policy "doc_svc_admin"  on doctor_services for all    to authenticated using (get_my_role() = 'admin') with check (get_my_role() = 'admin');

-- Leads
create policy "leads_read"   on leads for select to authenticated using (get_my_role() in ('admin','finance','reception','kc2','kc1'));
create policy "leads_insert" on leads for insert to authenticated with check (get_my_role() in ('admin','kc1'));
create policy "leads_update" on leads for update to authenticated using (get_my_role() in ('admin','kc1','finance'));

-- Clients
create policy "clients_read"   on clients for select to authenticated using (get_my_role() in ('admin','kc2','finance','lawyer','reception'));
create policy "clients_insert" on clients for insert to authenticated with check (get_my_role() in ('admin','finance'));
create policy "clients_update" on clients for update to authenticated using (get_my_role() in ('admin','finance','lawyer','kc2'));

-- Subscriptions
create policy "subs_read"   on subscriptions for select to authenticated using (get_my_role() in ('admin','kc2','finance','lawyer','doctor'));
create policy "subs_manage" on subscriptions for all    to authenticated using (get_my_role() in ('admin','finance')) with check (get_my_role() in ('admin','finance'));
create policy "subproc_read"   on subscription_procedures for select to authenticated using (get_my_role() in ('admin','kc2','finance','lawyer','doctor','reception'));
create policy "subproc_update" on subscription_procedures for update to authenticated using (get_my_role() in ('admin','doctor'));
create policy "subproc_insert" on subscription_procedures for insert to authenticated with check (get_my_role() in ('admin','finance'));

-- Appointments
create policy "appts_read"   on appointments for select to authenticated using (get_my_role() in ('admin','reception','kc1','kc2','doctor'));
create policy "appts_insert" on appointments for insert to authenticated with check (get_my_role() in ('admin','reception','kc1'));
create policy "appts_update" on appointments for update to authenticated using (get_my_role() in ('admin','reception','doctor'));

-- ── SEED DATA ─────────────────────────────────────────────
insert into services (name, category, price) values
  ('Ботокс — лоб',                'Инъекции', 45000),
  ('Ботокс — межбровье',          'Инъекции', 35000),
  ('Контурная пластика — губы',   'Инъекции', 85000),
  ('Контурная пластика — скулы',  'Инъекции', 95000),
  ('Мезотерапия — лицо',          'Мезо',     35000),
  ('Мезотерапия — волосы',        'Мезо',     28000),
  ('Биоревитализация',            'Мезо',     65000),
  ('Лазерное омоложение',         'Лазер',   120000),
  ('Лазерная эпиляция (зона)',    'Лазер',    55000),
  ('Чистка лица',                 'Уход',     22000),
  ('Пилинг химический',           'Уход',     30000);

insert into doctors (name, spec, schedule) values
  ('Карина Алматова',  'Инъекционист',
   '{"mon":"10:00-18:00","tue":"10:00-18:00","wed":"—","thu":"10:00-18:00","fri":"10:00-17:00"}'),
  ('Ольга Михайлова',  'Лазерный специалист',
   '{"mon":"09:00-17:00","tue":"—","wed":"09:00-17:00","thu":"09:00-17:00","fri":"09:00-16:00"}'),
  ('Диана Сергеева',   'Дерматолог-косметолог',
   '{"mon":"11:00-19:00","tue":"11:00-19:00","wed":"11:00-19:00","thu":"—","fri":"11:00-18:00"}');

-- ── REFUNDS ─────────────────────────────────────────────────
-- Run this migration in Supabase SQL Editor
create type refund_status as enum ('requested','lawyer_review','approved','rejected');

create table if not exists refunds (
  id               uuid primary key default uuid_generate_v4(),
  client_id        uuid references clients on delete cascade not null,
  subscription_id  uuid references subscriptions on delete set null,
  amount           integer not null default 0,
  reason           text not null,
  status           refund_status not null default 'requested',
  requested_by     uuid references profiles,
  lawyer_comment   text,
  admin_comment    text,
  requested_at     timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table refunds enable row level security;
create policy "refunds_read"   on refunds for select to authenticated using (get_my_role() in ('admin','kc2','lawyer'));
create policy "refunds_insert" on refunds for insert to authenticated with check (get_my_role() in ('admin','kc2'));
create policy "refunds_update" on refunds for update to authenticated using (get_my_role() in ('admin','lawyer'));

-- Also add refund_requested to client_status enum if not already present
-- Note: enum values cannot be dropped, only added
alter type client_status add value if not exists 'refund_requested';
