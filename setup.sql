-- Capri: configurazione del database Supabase
-- Incolla tutto nel "SQL Editor" del progetto e premi "Run". Si può rieseguire senza danni.

-- 1) Tabella unica per ticket, wishlist, fogli e impostazioni
create table if not exists public.docs (
  user_id uuid not null references auth.users(id) on delete cascade,
  coll text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, coll, id)
);

-- 2) Ognuno vede e modifica solo i propri dati
alter table public.docs enable row level security;
drop policy if exists "docs_select_own" on public.docs;
drop policy if exists "docs_insert_own" on public.docs;
drop policy if exists "docs_update_own" on public.docs;
drop policy if exists "docs_delete_own" on public.docs;
create policy "docs_select_own" on public.docs for select to authenticated using (user_id = auth.uid());
create policy "docs_insert_own" on public.docs for insert to authenticated with check (user_id = auth.uid());
create policy "docs_update_own" on public.docs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "docs_delete_own" on public.docs for delete to authenticated using (user_id = auth.uid());

-- 3) Sincronizzazione in tempo reale tra i dispositivi
alter table public.docs replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;

-- 4) Archivio privato per gli allegati (massimo 50 MB per file)
insert into storage.buckets (id, name, public, file_size_limit)
values ('allegati', 'allegati', false, 52428800)
on conflict (id) do nothing;

drop policy if exists "allegati_select_own" on storage.objects;
drop policy if exists "allegati_insert_own" on storage.objects;
drop policy if exists "allegati_update_own" on storage.objects;
drop policy if exists "allegati_delete_own" on storage.objects;
create policy "allegati_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'allegati' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "allegati_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'allegati' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "allegati_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'allegati' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "allegati_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'allegati' and (storage.foldername(name))[1] = auth.uid()::text);
