-- Internal follow-up is part of the app's privacy notice, not per-lot publication consent.
-- Keep the legacy share_results values unchanged: they are NOT public consent.
alter policy incubation_consented_admin_read on public.incubacion_lotes
 using (exists(select 1 from public.tienda_admins where user_id=(select auth.uid())));
alter policy incubation_consented_admin_read on public.incubacion_lotes
 rename to incubation_admin_read;
revoke update(share_results) on public.incubacion_lotes from authenticated;
comment on column public.incubacion_lotes.share_results is
 'Legacy internal-sharing flag; no longer controls administrator access and never authorizes public publication.';
-- Owner INSERT/UPDATE/DELETE and SELECT policies remain unchanged.
-- No anonymous grants, public results, administrator writes, or finance-table changes.
