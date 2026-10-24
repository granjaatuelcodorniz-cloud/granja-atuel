-- Applied after incubation-schema.sql. Preserves existing lot protocols.
alter table public.incubacion_lotes add column provider_name text not null default '' check(length(provider_name)<=100);
grant insert(provider_name) on public.incubacion_lotes to authenticated;
