-- ============================================================
-- PASS'ADRESSES — TABLE : pass_adresses
-- Demandes BIA — cœur du module Pass'Adresses
-- ============================================================

create table public.pass_adresses (
  id                          uuid primary key default gen_random_uuid(),

  -- Référence lisible
  reference                   varchar(50) unique,   -- ex: REF-20260129-214317

  -- Relations
  user_id                     uuid not null
                              references public.profiles(id)
                              on delete restrict,
  bien_id                     uuid not null
                              references public.biens(id)
                              on delete restrict,
  mandat_id                   uuid not null
                              references public.mandats(id)
                              on delete restrict,
  template_id                 uuid
                              references public.pass_templates(id)
                              on delete set null,
  contact_id                  uuid
                              references public.contacts(id)
                              on delete set null,

  -- Statut workflow
  statut                      text not null default 'brouillon'
                              constraint pass_adresses_statut_check check (
                                statut in ('brouillon','questionnaire_envoye',
                                           'reponse_a_traiter','complement_demande',
                                           'acceptee','refusee','archivee')
                              ),

  -- Paramètres questionnaire (copiés du template ou saisis manuellement)
  doc_identite_demande        boolean not null default false,
  doc_identite_obligatoire    boolean not null default false,
  signature_manuscrite        boolean not null default false,
  criteres_recherche          boolean not null default false,
  coordonnees_dans_bia        boolean not null default false,
  verification_sms            boolean not null default true,

  -- Données prospect
  prospect_civilite           varchar(10),
  prospect_prenom             varchar(100),
  prospect_nom                varchar(100),
  prospect_email              varchar(255),
  prospect_telephone          varchar(20),
  prospect_tel_verifie        boolean not null default false,
  prospect_adresse            varchar(255),
  prospect_ville              varchar(100),
  prospect_code_postal        varchar(10),

  -- Pièce d'identité
  doc_identite_url            text,
  doc_identite_type           varchar(20),   -- cni, passeport, titre_sejour
  doc_identite_verifie        boolean not null default false,

  -- Signature manuscrite
  signature_url               text,
  signature_at                timestamptz,

  -- Zone de recherche prospect
  recherche_type_bien         text[],
  recherche_budget_min        integer,
  recherche_budget_max        integer,
  recherche_ville             varchar(100),
  recherche_code_postal       varchar(10),
  recherche_lat               decimal(10,8),
  recherche_lng               decimal(11,8),
  recherche_rayon_km          integer,
  recherche_criteres          text,

  -- OTP SMS (code jamais stocké en clair)
  sms_code_hash               varchar(255),
  sms_code_expire_at          timestamptz,
  sms_verified_at             timestamptz,
  sms_tentatives              integer not null default 0,

  -- Origine
  origine                     varchar(100),
  origine_detail              varchar(255),

  -- Scoring
  score_valeur                decimal(4,2),
  score_lettre                varchar(1)
                              constraint pass_adresses_score_check check (
                                score_lettre in ('A','B','C','D')
                              ),
  score_detail                jsonb not null default '{}'::jsonb,

  -- Magic link questionnaire (token stocké en clair — usage unique)
  magic_token                 uuid unique,
  magic_token_expire_at       timestamptz,
  magic_token_used_at         timestamptz,
  magic_token_invalide        boolean not null default false,

  -- Complément d'information
  complement_magic_token      uuid,
  complement_magic_expire_at  timestamptz,
  complement_magic_used_at    timestamptz,
  complement_message          text,
  complement_demande_at       timestamptz,
  complement_recu_at          timestamptz,
  nb_complements_demandes     integer not null default 0,

  -- Landing page bien
  landing_token               uuid unique,
  landing_url                 text,
  landing_vues                integer not null default 0,

  -- QR Code
  qrcode_url                  text,
  qrcode_scans                integer not null default 0,

  -- BIA généré
  bia_genere_at               timestamptz,
  bia_url                     text,
  bia_envoye_prospect_at      timestamptz,
  bia_envoye_vendeur_at       timestamptz,

  -- Adresse révélée (chiffrée côté app)
  adresse_revelee             text,
  adresse_revelee_at          timestamptz,

  -- Preuve électronique
  prospect_ip                 inet,
  prospect_user_agent         text,

  -- Dates clés workflow
  questionnaire_envoye_at     timestamptz,
  reponse_recue_at            timestamptz,
  traite_at                   timestamptz,

  -- Évolutivité
  metadata                    jsonb not null default '{}'::jsonb,

  -- Horodatage
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  deleted_at                  timestamptz
);

create index idx_pass_adresses_user_id      on public.pass_adresses(user_id);
create index idx_pass_adresses_statut       on public.pass_adresses(statut);
create index idx_pass_adresses_magic_token  on public.pass_adresses(magic_token);
create index idx_pass_adresses_landing_token on public.pass_adresses(landing_token);
create index idx_pass_adresses_created_at   on public.pass_adresses(created_at);
create index idx_pass_adresses_bien_id      on public.pass_adresses(bien_id);
create index idx_pass_adresses_contact_id   on public.pass_adresses(contact_id);

create trigger update_pass_adresses_updated_at
  before update on public.pass_adresses
  for each row execute function update_updated_at_column();

alter table public.pass_adresses enable row level security;

create policy "pass_adresses_select_own"
  on public.pass_adresses for select
  to authenticated
  using (user_id = auth.uid() and deleted_at is null);

create policy "pass_adresses_insert_own"
  on public.pass_adresses for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "pass_adresses_update_own"
  on public.pass_adresses for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "pass_adresses_delete_own"
  on public.pass_adresses for delete
  to authenticated
  using (user_id = auth.uid());
