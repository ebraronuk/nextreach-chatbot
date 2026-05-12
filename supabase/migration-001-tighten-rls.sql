-- =============================================================
-- Migration 001 — RLS Sikilastirma (GUVENLIK)
-- =============================================================
-- Sorun: Onceki schema.sql, admin realtime subscription icin anon role'e
-- permissive bir SELECT policy verdi:
--
--   create policy "leads anon select for realtime"
--     on public.leads for select to anon using (true);
--
-- Bu, Supabase URL ve anon key bilen herkesin (anon key public sayilir)
-- tum leadleri cekebilmesine yol acti. Production'da kabul edilemez.
--
-- Cozum: Anon SELECT policy'sini kaldir. Admin sayfasi zaten server-side'da
-- service_role ile cekiyor; realtime subscription'a gerek olursa
-- server-side broadcast tercih edilir (veya RLS-aware auth ile yapilir).
--
-- Calistirma: Supabase Dashboard > SQL Editor > New query > yapistir > Run.
-- =============================================================

drop policy if exists "leads anon select for realtime" on public.leads;

-- Dogrulama: bu komutla policy'lerin temizlendigini gor.
-- (anon icin tablonun SELECT erisimi olmadigini onaylar)
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where tablename = 'leads';

-- =============================================================
-- Beklenen sonuc: yukaridaki SELECT bos donmeli veya sadece service_role'a
-- ait policy'ler gosterilmeli. Anon icin policy YOK.
-- =============================================================
