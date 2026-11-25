-- Capri Musica: il programma sul PC dice "sono acceso, mi trovi qui".
-- Accetta solo la chiave musica personale (la crea Capri: sezione Musica → Collega il PC).
-- Può solo aggiornare lo stato del PC (indirizzo, numero di brani): non legge né modifica altri dati.
-- Incolla tutto nel SQL Editor di Supabase e premi Run. Si può rieseguire senza danni.

grant usage on schema public to anon;

create or replace function public.capri_music(p_key text, p_url text default null, p_info jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
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
  insert into public.docs (user_id, coll, id, data, updated_at)
  values (v_user, 'music', 'host', jsonb_build_object(
            'url', p_url,
            'at', (extract(epoch from clock_timestamp()) * 1000)::bigint,
            'info', coalesce(p_info, '{}'::jsonb) - 'url'), now())
  on conflict (user_id, coll, id) do update set data = excluded.data, updated_at = now();
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.capri_music(text, text, jsonb) from public;
grant execute on function public.capri_music(text, text, jsonb) to anon, authenticated;
