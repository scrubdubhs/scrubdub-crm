export type PipelineStage =
  | 'new_lead'
  | 'quoted'
  | 'follow_up'
  | 'booked'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'invoiced'
  | 'review_sent'
  | 'paid'
  | 'lost'

export type LeadSource = 'facebook_ad' | 'door_hanger' | 'word_of_mouth' | 'd2d' | 'referral' | 'other'

export type ServiceType = 'pressure_washing' | 'soft_washing' | 'window_cleaning'

export type PaymentMethod = 'stripe' | 'cash' | 'check' | 'unpaid'

export type RecurringFrequency = 'one_time' | 'biweekly' | 'monthly' | 'quarterly' | 'biannual' | 'annual'

export type DoorStatus = 'not_home' | 'not_interested' | 'interested' | 'quoted' | 'booked'

export interface Contact {
  id: string
  created_at: string
  first_name: string
  last_name: string
  email: string | null
  phone: string
  address: string
  city: string
  state: string
  zip: string
  notes: string | null
  recurring_frequency: RecurringFrequency
  next_service_date: string | null
  total_spent: number
  job_count: number
}

export interface Lead {
  id: string
  created_at: string
  contact_id: string | null
  contact?: Contact
  first_name: string
  last_name: string
  phone: string
  email: string | null
  address: string
  city: string
  state: string
  zip: string
  stage: PipelineStage
  source: LeadSource
  services_interested: ServiceType[]
  notes: string | null
  assigned_date: string | null
  follow_up_date: string | null
  quote_id: string | null
  job_id: string | null
}

export interface QuoteLineItem {
  id: string
  service_type: ServiceType
  description: string
  surface?: string
  sqft?: number
  quantity?: number
  unit_price: number
  total: number
}

export interface Quote {
  id: string
  created_at: string
  lead_id: string
  contact_id: string | null
  line_items: QuoteLineItem[]
  subtotal: number
  bundle_discount: number
  discount_amount: number
  total: number
  notes: string | null
  status: 'draft' | 'sent' | 'accepted' | 'declined'
  valid_until: string | null
}

export interface Job {
  id: string
  created_at: string
  lead_id: string
  contact_id: string
  contact?: Contact
  quote_id: string | null
  quote?: Quote
  services: ServiceType[]
  address: string
  city: string
  state: string
  zip: string
  scheduled_date: string
  arrival_time: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  total_price: number
  notes: string | null
  before_photos: string[]
  after_photos: string[]
  completed_at: string | null
  invoice_id: string | null
}

export interface Invoice {
  id: string
  created_at: string
  job_id: string
  job?: Job
  contact_id: string
  contact?: Contact
  line_items: QuoteLineItem[]
  subtotal: number
  bundle_discount: number
  discount_amount: number
  total: number
  payment_method: PaymentMethod
  payment_status: 'unpaid' | 'paid'
  paid_at: string | null
  stripe_payment_intent_id: string | null
  email_sent: boolean
  email_sent_at: string | null
  completed_date: string
}

export interface Territory {
  id: string
  created_at: string
  name: string
  boundary: GeoJsonPolygon
  color: string
  doors_knocked: number
  doors_interested: number
  doors_booked: number
  notes: string | null
}

export interface Door {
  id: string
  created_at: string
  territory_id: string | null
  address: string
  lat: number
  lng: number
  status: DoorStatus
  contact_id: string | null
  notes: string | null
  visited_at: string
}

export interface GeoJsonPolygon {
  type: 'Polygon'
  coordinates: number[][][]
}

export interface Notification {
  id: string
  created_at: string
  type: 'weather_alert' | 'follow_up_reminder' | 'job_reminder' | 'lead_submitted'
  title: string
  message: string
  read: boolean
  metadata: Record<string, unknown>
}

export interface DashboardStats {
  total_leads: number
  total_revenue: number
  revenue_this_month: number
  revenue_last_month: number
  close_rate: number
  show_rate: number
  avg_job_value: number
  jobs_completed_this_month: number
  leads_by_source: Record<LeadSource, number>
  pipeline_counts: Record<PipelineStage, number>
  top_services: { service: ServiceType; count: number; revenue: number }[]
  monthly_revenue: { month: string; revenue: number }[]
  conversion_by_stage: { stage: PipelineStage; count: number; pct: number }[]
}
