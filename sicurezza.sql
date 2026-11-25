-- Capri: rende obbligatoria la verifica in due passaggi anche per il database.
-- Vale solo se hai attivato la verifica in due passaggi (menu ⋯ → Sicurezza dell'account):
-- da quel momento il database risponde solo a chi è entrato con password + codice.
-- Widget, Siri e notifiche non cambiano: usano canali separati.
-- Incolla tutto nel SQL Editor di Supabase e premi Run. Si può rieseguire senza danni.

drop policy if exists "capri_mfa" on public.docs;
create policy "capri_mfa" on public.docs as restrictive to authenticated
  using (
    array[(select auth.jwt()->>'aal')] <@ (
      select case when count(id) > 0 then array['aal2'] else array['aal1', 'aal2'] end
      from auth.mfa_factors where user_id = (select auth.uid()) and status = 'verified'
    )
  )
  with check (
    array[(select auth.jwt()->>'aal')] <@ (
      select case when count(id) > 0 then array['aal2'] else array['aal1', 'aal2'] end
      from auth.mfa_factors where user_id = (select auth.uid()) and status = 'verified'
    )
  );

drop policy if exists "capri_mfa_allegati" on storage.objects;
create policy "capri_mfa_allegati" on storage.objects as restrictive to authenticated
  using (
    bucket_id <> 'allegati' or array[(select auth.jwt()->>'aal')] <@ (
      select case when count(id) > 0 then array['aal2'] else array['aal1', 'aal2'] end
      from auth.mfa_factors where user_id = (select auth.uid()) and status = 'verified'
    )
  )
  with check (
    bucket_id <> 'allegati' or array[(select auth.jwt()->>'aal')] <@ (
      select case when count(id) > 0 then array['aal2'] else array['aal1', 'aal2'] end
      from auth.mfa_factors where user_id = (select auth.uid()) and status = 'verified'
    )
  );
