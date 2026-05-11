-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  company text NOT NULL,
  email text NOT NULL,
  phone text,
  intent text CHECK (intent = ANY (ARRAY['demo'::text, 'pricing'::text, 'integration'::text, 'support'::text, 'other'::text])),
  volume text CHECK (volume = ANY (ARRAY['<500'::text, '500-5k'::text, '5k-50k'::text, '50k+'::text])),
  current_tool text,
  timeline text CHECK (timeline = ANY (ARRAY['this-week'::text, 'this-month'::text, 'this-quarter'::text, 'researching'::text])),
  preferred_contact_time text,
  score integer NOT NULL DEFAULT 0,
  temperature text NOT NULL DEFAULT 'cold'::text CHECK (temperature = ANY (ARRAY['hot'::text, 'warm'::text, 'cold'::text])),
  score_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_summary text,
  transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  conversation_duration_sec integer,
  ip_hash text,
  user_agent text,
  honeypot_filled boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'new'::text CHECK (status = ANY (ARRAY['new'::text, 'contacted'::text, 'qualified'::text, 'rejected'::text])),
  CONSTRAINT leads_pkey PRIMARY KEY (id)
);