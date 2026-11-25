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

-- 2b) Permessi della tabella per gli utenti collegati (necessari sui progetti Supabase recenti)
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.docs to authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.docs to service_role;

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

-- ===== Ingresso per widget e Siri su iPhone (vedi anche iphone/capri_api.sql) =====
grant usage on schema public to anon;

create or replace function public.capri_api(
  p_token text,
  p_action text,
  p_tipo text default null,
  p_testo text default null,
  p_importo numeric default null,
  p_categoria text default null,
  p_extra text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_today text := to_char(now() at time zone 'Europe/Rome', 'YYYY-MM-DD');
  v_month text := to_char(now() at time zone 'Europe/Rome', 'YYYY-MM');
  v_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_id text := 'ip' || substr(md5(random()::text || clock_timestamp()::text), 1, 14);
  v_num int;
  v_data jsonb;
  v_coll text;
  v_testo text := coalesce(trim(p_testo), '');
begin
  if p_token is null or length(p_token) < 32 then
    raise exception 'token non valido';
  end if;
  select d.user_id into v_user
    from public.docs d
   where d.coll = 'apitoken' and d.id = 'main' and d.data->>'token' = p_token
   limit 1;
  if v_user is null then
    raise exception 'token non valido';
  end if;

  if p_action = 'riepilogo' then
    return jsonb_build_object(
      'oggi', v_today,
      'tickets', coalesce((select jsonb_agg(jsonb_build_object('title', d.data->>'title', 'urg', d.data->'urg', 'due', d.data->>'due', 'cat', d.data->>'cat'))
                             from public.docs d where d.user_id = v_user and d.coll = 'tickets' and coalesce(d.data->>'status', '') <> 'fatto'), '[]'::jsonb),
      'spese', coalesce((select jsonb_agg(jsonb_build_object('d', d.data->>'d', 'amt', d.data->'amt', 'cat', d.data->>'cat'))
                           from public.docs d where d.user_id = v_user and d.coll = 'spese' and left(coalesce(d.data->>'d', ''), 7) = v_month), '[]'::jsonb),
      'abbonamenti', coalesce((select jsonb_agg(jsonb_build_object('name', d.data->>'name', 'amt', d.data->'amt', 'next', d.data->>'next'))
                                 from public.docs d where d.user_id = v_user and d.coll = 'abbonamenti' and coalesce(d.data->>'active', 'true') <> 'false'), '[]'::jsonb),
      'config', coalesce((select jsonb_build_object('name', d.data->>'name', 'sbudget', d.data->'sbudget', 'scats', d.data->'scats', 'tcats', d.data->'tcats', 'dcats', d.data->'dcats')
                            from public.docs d where d.user_id = v_user and d.coll = 'config' and d.id = 'main'), '{}'::jsonb)
    );
  end if;

  if p_action is distinct from 'aggiungi' then
    raise exception 'azione non valida';
  end if;

  if p_tipo = 'spesa' then
    if p_importo is null or p_importo = 0 then raise exception 'importo mancante'; end if;
    v_coll := 'spese';
    v_data := jsonb_build_object('d', v_today, 'amt', round(abs(p_importo), 2), 'cat', coalesce(nullif(trim(p_categoria), ''), 'Altro'),
                                 'note', v_testo, 'at', v_ms, 'from', 'iphone');
  elsif p_tipo = 'ticket' then
    if v_testo = '' then raise exception 'testo mancante'; end if;
    v_coll := 'tickets';
    select coalesce(max((d.data->>'num')::int), 0) + 1 into v_num
      from public.docs d where d.user_id = v_user and d.coll = 'tickets' and coalesce(d.data->>'num', '') ~ '^[0-9]+$';
    v_data := jsonb_build_object('title', v_testo, 'cat', coalesce(trim(p_categoria), ''),
                                 'urg', least(greatest(coalesce(p_importo, 2)::int, 1), 4), 'status', 'aperto',
                                 'due', case when coalesce(p_extra, '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then p_extra else '' end,
                                 'desc', '', 'att', '[]'::jsonb,
                                 'notes', jsonb_build_array(jsonb_build_object('t', v_ms, 'x', 'Creato dall''iPhone')),
                                 'created', v_ms, 'upd', v_ms, 'num', v_num);
  elsif p_tipo = 'nota' then
    if v_testo = '' then raise exception 'testo mancante'; end if;
    v_coll := 'note';
    v_data := jsonb_build_object('title', '', 'body', v_testo, 'kind', 'testo', 'items', '[]'::jsonb, 'color', '#22d3ee',
                                 'pin', false, 'created', v_ms, 'upd', v_ms);
  elsif p_tipo = 'diary' then
    if v_testo = '' then raise exception 'testo mancante'; end if;
    v_coll := 'diary';
    v_data := jsonb_build_object('title', v_testo, 'body', coalesce(p_extra, ''), 'cat', coalesce(trim(p_categoria), ''),
                                 'tags', '[]'::jsonb, 'date', v_today, 'pin', false, 'created', v_ms, 'upd', v_ms);
  else
    raise exception 'tipo non valido';
  end if;

  insert into public.docs (user_id, coll, id, data, updated_at) values (v_user, v_coll, v_id, v_data, now());
  return jsonb_build_object('ok', true, 'tipo', p_tipo, 'id', v_id, 'num', v_num);
end;
$$;

revoke all on function public.capri_api(text, text, text, text, numeric, text, text) from public;
grant execute on function public.capri_api(text, text, text, text, numeric, text, text) to anon, authenticated;

-- ===== Capri Musica: stato del PC (vedi anche musica/capri_music.sql) =====
grant usage on schema public to anon;

create or replace function public.capri_music(p_key text, p_url text default null, p_info jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_cur jsonb;
  v_now bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_name text := coalesce(p_info->>'name', '');
  v_del jsonb;
begin
  if p_key is null or length(p_key) < 32 then
    raise exception 'chiave non valida';
  end if;
  select d.user_id into v_user
    from public.docs d
   where d.coll = 'music' and d.id = 'key' and d.data->>'key' = p_key
   limit 1;
  if v_user is null then
    raise exception 'chiave non valida';
  end if;
  if p_url is not null and p_url !~ '^https://[a-z0-9-]+\.trycloudflare\.com$' then
    raise exception 'indirizzo non valido';
  end if;
  select coalesce(jsonb_agg(k), '[]'::jsonb) into v_del
    from public.docs d, jsonb_object_keys(coalesce(d.data->'ids', '{}'::jsonb)) k
   where d.user_id = v_user and d.coll = 'music' and d.id = 'deleted' and jsonb_typeof(d.data->'ids') = 'object';
  select d.data into v_cur from public.docs d where d.user_id = v_user and d.coll = 'music' and d.id = 'host';
  if v_cur is not null and v_cur->>'url' is not null
     and coalesce(v_cur->'info'->>'name', '') is distinct from v_name
     and coalesce((v_cur->>'at')::bigint, 0) > v_now - 150000 then
    return jsonb_build_object('ok', true, 'active', false, 'busy', v_cur->'info'->>'name', 'del', v_del);
  end if;
  insert into public.docs (user_id, coll, id, data, updated_at)
  values (v_user, 'music', 'host', jsonb_build_object(
            'url', p_url,
            'at', v_now,
            'info', coalesce(p_info, '{}'::jsonb) - 'url'), now())
  on conflict (user_id, coll, id) do update set data = excluded.data, updated_at = now();
  return jsonb_build_object('ok', true, 'active', true, 'del', v_del);
end;
$$;

revoke all on function public.capri_music(text, text, jsonb) from public;
grant execute on function public.capri_music(text, text, jsonb) to anon, authenticated;
