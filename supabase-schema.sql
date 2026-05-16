-- Scrub-A-Dub CRM — Supabase Schema
-- Run this in your Supabase SQL editor (supabase.com > project > SQL editor)

-- Contacts
create table contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  first_name text not null,
  last_name text not null,
  email text,
  phone text not null,
  address text not null,
  city text not null,
  state text default 'IL',
  zip text not null,
  notes text,
  recurring_frequency text default 'one_time' check (recurring_frequency in ('one_time','quarterly','biannual','annual')),
  next_service_date date,
  total_spent numeric default 0,
  job_count int default 0
);

-- Leads (Pipeline)
create table leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  contact_id uuid references contacts(id),
  first_name text not null,
  last_name text not null,
  phone text not null,
  email text,
  address text not null,
  city text not null,
  state text default 'IL',
  zip text not null,
  stage text default 'new_lead' check (stage in ('new_lead','quoted','follow_up','booked','scheduled','in_progress','completed','invoiced','review_sent','paid','lost')),
  source text not null check (source in ('facebook_ad','door_hanger','word_of_mouth','d2d','referral','other')),
  services_interested text[] default '{}',
  notes text,
  assigned_date date,
  follow_up_date date,
  quote_id uuid,
  job_id uuid
);

-- Quotes
create table quotes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  lead_id uuid references leads(id),
  contact_id uuid references contacts(id),
  line_items jsonb default '[]',
  subtotal numeric default 0,
  bundle_discount numeric default 0,
  discount_amount numeric default 0,
  total numeric default 0,
  notes text,
  status text default 'draft' check (status in ('draft','sent','accepted','declined')),
  valid_until date
);

-- Jobs
create table jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  lead_id uuid references leads(id),
  contact_id uuid references contacts(id) not null,
  quote_id uuid references quotes(id),
  services text[] not null,
  address text not null,
  city text not null,
  state text default 'IL',
  zip text not null,
  scheduled_date date not null,
  arrival_time time not null,
  status text default 'scheduled' check (status in ('scheduled','in_progress','completed','cancelled')),
  total_price numeric not null,
  notes text,
  before_photos text[] default '{}',
  after_photos text[] default '{}',
  completed_at timestamptz,
  invoice_id uuid
);

-- Invoices
create table invoices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  job_id uuid references jobs(id) not null,
  contact_id uuid references contacts(id) not null,
  line_items jsonb default '[]',
  subtotal numeric default 0,
  bundle_discount numeric default 0,
  discount_amount numeric default 0,
  total numeric not null,
  payment_method text default 'unpaid' check (payment_method in ('stripe','cash','check','unpaid')),
  payment_status text default 'unpaid' check (payment_status in ('unpaid','paid')),
  paid_at timestamptz,
  stripe_payment_intent_id text,
  email_sent boolean default false,
  email_sent_at timestamptz,
  completed_date date not null
);

-- Territories (D2D)
create table territories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  boundary jsonb,
  color text default '#3b82f6',
  doors_knocked int default 0,
  doors_interested int default 0,
  doors_booked int default 0,
  notes text
);

-- Doors (D2D individual)
create table doors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  territory_id uuid references territories(id),
  address text not null,
  lat numeric not null,
  lng numeric not null,
  status text default 'not_home' check (status in ('not_home','not_interested','interested','quoted','booked')),
  contact_id uuid references contacts(id),
  notes text,
  visited_at timestamptz default now()
);

-- Notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  type text not null,
  title text not null,
  message text not null,
  read boolean default false,
  metadata jsonb default '{}'
);

-- Settings
create table settings (
  id int primary key default 1,
  google_review_link text,
  my_phone text default '636-281-6111',
  job_minimum numeric default 129,
  follow_up_days int default 3,
  text_templates jsonb,
  pricing jsonb,
  vapid_subscription jsonb
);

-- Insert default settings row
insert into settings (id) values (1) on conflict do nothing;

-- Storage bucket for job photos
-- Run in Supabase dashboard: Storage > New bucket > "job-photos" (public)
