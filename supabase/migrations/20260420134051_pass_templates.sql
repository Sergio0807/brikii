-- ============================================================
-- PASS'ADRESSES — TABLE : pass_templates
-- Templates de questionnaire réutilisables par l'agent
-- ============================================================

create table public.pass_templates (
  id                        uuid primary key default gen_random_uuid(),

  user_id                   uuid not null
                            references public.profiles(id)
                            on delete restrict,

  nom                       varchar(100) not null,
  is_default                boolean not null default false,

  -- Options questionnaire
  doc_identite_demande      boolean not null default false,
  doc_identite_obligatoire  boolean not null default false,
  signature_manuscrite      boolean not null default false,
  criteres_recherche        boolean not null default true,
  coordonnees_dans_bia      boolean not null default false,
  verification_sms          boolean not null default true,

  -- Relances automatiques
  relance_1_delai_h         integer not null default 24,
  relance_1_type            text not null default 'email'
                            constraint pass_templates_relance1_check check (
                              relance_1_type in ('email','sms','les_deux')
                            ),
  relance_2_delai_h         integer not null default 48,
  relance_2_type            text not null default 'sms'
                            constraint pass_templates_relance2_check check (
                              relance_2_type in ('email','sms','les_deux')
                            ),
  archivage_auto_h          integer not null default 72,

  -- Évolutivité
  metadata                  jsonb not null default '{}'::jsonb,

  -- Horodatage
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  deleted_at                timestamptz
);

create index idx_pass_templates_user_id on public.pass_templates(user_id);

create trigger update_pass_templates_updated_at
  before update on public.pass_templates
  for each row execute function update_updated_at_column();

alter table public.pass_templates enable row level security;

create policy "pass_templates_select_own"
  on public.pass_templates for select
  to authenticated
  using (user_id = auth.uid() and deleted_at is null);

create policy "pass_templates_insert_own"
  on public.pass_templates for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "pass_templates_update_own"
  on public.pass_templates for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "pass_templates_delete_own"
  on public.pass_templates for delete
  to authenticated
  using (user_id = auth.uid());
