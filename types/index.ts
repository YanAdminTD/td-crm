// ─── User & Auth ──────────────────────────────────────────
export type UserRole =
  | 'admin'
  | 'kc1'
  | 'kc2'
  | 'finance'
  | 'lawyer'
  | 'reception'
  | 'doctor'

// Matches actual Supabase profiles table
export interface Profile {
  id:            string
  auth_user_id?: string
  full_name:     string
  email?:        string
  phone?:        string
  role:          UserRole
  is_active:     boolean
  created_at:    string
  updated_at?:   string
}

// ─── Services ─────────────────────────────────────────────
export interface ServiceCategory {
  id:          string
  name:        string
  description?: string
  is_active:   boolean
  created_at:  string
}

export interface Service {
  id:               string
  category_id?:     string
  name:             string
  description?:     string
  price:            number
  duration_minutes?: number
  is_active:        boolean
  created_at:       string
  service_categories?: ServiceCategory
}

// ─── Doctors ──────────────────────────────────────────────
export interface Doctor {
  id:         string
  full_name:  string
  spec:       string
  schedule?:  Record<string, string>
  is_active:  boolean
  created_at: string
}

// ─── Clients (KC-1 leads + KC-2 base) ────────────────────
export type ClientStatus =
  | 'new_lead'
  | 'in_progress'
  | 'lost'
  | 'paid'
  | 'active'
  | 'vip'
  | 'refund_requested'

export interface Client {
  id:                  string
  full_name:           string
  phone:               string
  email?:              string
  birth_date?:         string
  city?:               string
  source?:             string
  status:              ClientStatus
  responsible_kc1_id?: string
  responsible_kc2_id?: string
  comment?:            string
  created_at:          string
  updated_at:          string
}

// ─── Subscriptions ────────────────────────────────────────
export type SubscriptionStatus = 'active' | 'completed' | 'cancelled'

export interface Subscription {
  id:               string
  client_id:        string
  name:             string
  total_visits:     number
  used_visits:      number
  remaining_visits: number
  status:           SubscriptionStatus
  sold_by?:         string
  assigned_kc2_id?: string
  start_date?:      string
  end_date?:        string
  created_at:       string
  updated_at?:      string
  // joined
  subscription_services?: SubscriptionService[]
  clients?:         Client
}

export interface SubscriptionService {
  id:              string
  subscription_id: string
  service_id:      string
  allowed_visits:  number
  used_visits:     number
  created_at:      string
  services?:       Service
}

// ─── Appointments ─────────────────────────────────────────
export interface Appointment {
  id:          string
  client_id?:  string
  service_id:  string
  doctor_id?:  string
  appt_date:   string
  appt_time:   string
  arrived:     boolean
  in_doctor:   boolean
  proc_done:   boolean
  kc_type:     'КЦ-1' | 'КЦ-2'
  created_at:  string
  // joined
  services?:   Service
  doctors?:    Doctor
  clients?:    Client
}

// ─── Refunds ──────────────────────────────────────────────
export type RefundStatus = 'requested' | 'lawyer_review' | 'approved' | 'rejected'

export interface Refund {
  id:              string
  client_id:       string
  subscription_id?: string
  amount:          number
  reason:          string
  status:          RefundStatus
  requested_by?:   string
  lawyer_comment?: string
  admin_comment?:  string
  requested_at:    string
  updated_at?:     string
  // joined
  clients?:        Client
  subscriptions?:  Subscription
  profiles?:       Profile
  visit_at?: string
}
