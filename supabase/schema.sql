-- =============================================================
-- NextReach Chatbot — Supabase Schema
-- =============================================================
-- Bu dosyayi Supabase Dashboard > SQL Editor'a kopyala-yapistir,
-- "Run" tikla. Tablolar, indeksler ve RLS politikalari kurulacak.
-- =============================================================

-- 1) leads tablosu
create table if not exists public.leads (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),

  -- Kimlik
  name            text not null,
  company         text not null,
  email           text not null,
  phone           text,

  -- Kalifikasyon
  intent          text check (intent in ('demo','pricing','integration','support','other')),
  volume          text check (volume in ('<500','500-5k','5k-50k','50k+')),
  current_tool    text,
  timeline        text check (timeline in ('this-week','this-month','this-quarter','researching')),
  preferred_contact_time text,

  -- Skor + analiz
  score           int not null default 0,
  temperature     text not null default 'cold' check (temperature in ('hot','warm','cold')),
  score_breakdown jsonb not null default '[]'::jsonb,
  ai_summary      text,

  -- Konusma
  transcript                jsonb not null default '[]'::jsonb,
  conversation_duration_sec int,

  -- Spam savunma + denetim
  ip_hash         text,
  user_agent      text,
  honeypot_filled boolean not null default false,

  -- Yasam dongusu
  status          text not null default 'new' check (status in ('new','contacted','qualified','rejected'))
);

-- 2) Hizli sorgular icin indeksler
create index if not exists leads_created_at_idx     on public.leads (created_at desc);
create index if not exists leads_temperature_idx    on public.leads (temperature);
create index if not exists leads_status_idx         on public.leads (status);
create index if not exists leads_score_idx          on public.leads (score desc);

-- 3) Row Level Security
-- Bu MVP'de service_role key sunucudan yaziyor.
-- anon (browser) DOGRUDAN yazamasin/okuyamasin -> butun yazma/okuma API route uzerinden.
alter table public.leads enable row level security;

-- Anon kullaniciya hicbir izin verme (default deny zaten yeterli ama net olsun).
-- Eger ileride dogrudan client-side okumak istersek, asagida ornek bir policy:
--   create policy "allow read for service role" on public.leads
--     for select using (auth.role() = 'service_role');

-- 4) Realtime aktif et (admin panelinde anlik yeni lead bildirimi icin)
alter publication supabase_realtime add table public.leads;

-- =============================================================
-- Bittiginde: SELECT count(*) FROM public.leads;  -> 0 donmeli
-- =============================================================
