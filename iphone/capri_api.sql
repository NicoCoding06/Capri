-- Capri: ingresso per widget e Siri (iPhone, app Scriptable).
-- Accetta solo richieste con il tuo token personale (lo crea Capri: menu ⋯ → Siri e widget).
-- Può: leggere un riepilogo (ticket aperti, spese del mese, abbonamenti) e aggiungere
-- spese, ticket, note e appunti del Diary. Non può modificare né cancellare niente.
-- Incolla tutto nel SQL Editor di Supabase e premi Run. Si può rieseguire senza danni.

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
