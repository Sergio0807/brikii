-- ============================================================
-- BIENS — table centrale + sous-tables par type
-- Types couverts : maison, appartement, terrain, immeuble, commerce
-- Types à venir  : local (migration ultérieure)
-- ============================================================


-- ============================================================
-- TABLE : biens
-- ============================================================

create table public.biens (
  id                    uuid primary key default gen_random_uuid(),

  -- Propriétaire du mandat
  user_id               uuid not null
                        references public.profiles(id)
                        on delete restrict,

  -- Identité
  reference             varchar(50) unique,

  -- Type et statut
  type                  text not null
                        constraint biens_type_check check (
                          type in ('maison','appartement','terrain',
                                   'immeuble','commerce','local','autre')
                        ),
  statut                text not null default 'brouillon'
                        constraint biens_statut_check check (
                          statut in ('brouillon','sur_le_marche','sous_offre',
                                     'vendu','archive')
                        ),

  -- Prix
  prix                  integer,
  prix_hono_inclus      boolean default false,

  -- Localisation
  adresse               varchar(255),
  ville                 varchar(100),
  code_postal           varchar(10),
  departement           varchar(3),
  latitude              decimal(10,8),
  longitude             decimal(11,8),
  localisation_approx   varchar(100),   -- ex: "Secteur Albi" pour pools.immo

  -- Surfaces principales
  surface_hab           decimal(8,2),
  surface_terrain       decimal(10,2),

  -- Descriptif
  descriptif            text,

  -- Source (import n8n)
  source_url            text,
  source_portail        varchar(50),

  -- Sécurité docs
  mot_de_passe_docs     varchar(20),

  -- Partage pool
  partage_pool          boolean default false,
  taux_retrocession     decimal(5,2),

  -- Évolutivité
  metadata              jsonb not null default '{}'::jsonb,

  -- Horodatage
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

create index idx_biens_user_id    on public.biens(user_id);
create index idx_biens_type       on public.biens(type);
create index idx_biens_statut     on public.biens(statut);
create index idx_biens_code_postal on public.biens(code_postal);

create trigger update_biens_updated_at
  before update on public.biens
  for each row execute function update_updated_at_column();

alter table public.biens enable row level security;

create policy "biens_select_own"
  on public.biens for select
  to authenticated
  using (user_id = auth.uid() and deleted_at is null);

create policy "biens_insert_own"
  on public.biens for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "biens_update_own"
  on public.biens for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "biens_delete_own"
  on public.biens for delete
  to authenticated
  using (user_id = auth.uid());


-- ============================================================
-- TABLE : biens_maisons
-- (structure partagée avec biens_appartements —
--  certains champs seront NULL selon l'usage réel)
-- ============================================================

create table public.biens_maisons (
  id                    uuid primary key default gen_random_uuid(),
  bien_id               uuid not null unique
                        references public.biens(id)
                        on delete cascade,

  -- Pièces
  nb_pieces             integer,
  nb_chambres           integer,
  nb_sdb                integer,
  nb_sde                integer,
  nb_wc                 integer,
  nb_niveaux            integer,
  etage                 integer,
  nb_etages_immo        integer,

  -- État
  etat_general          text constraint biens_maisons_etat_check check (
                          etat_general in ('neuf','tres_bon','bon',
                                           'a_rafraichir','a_renover','a_demolir')
                        ),
  travaux               boolean,
  montant_travaux       decimal(10,2),
  annee_construction    integer,

  -- Équipements
  garage                boolean,
  nb_garages            integer,
  parking               boolean,
  nb_parkings           integer,
  cave                  boolean,
  grenier               boolean,
  sous_sol              boolean,
  piscine               boolean,
  terrain_clos          boolean,

  -- Chauffage & énergie
  type_chauffage        text constraint biens_maisons_chauffage_check check (
                          type_chauffage in ('gaz','electrique','fioul',
                                             'bois','pompe_chaleur','autre')
                        ),
  dpe_lettre            text constraint biens_maisons_dpe_check check (
                          dpe_lettre in ('A','B','C','D','E','F','G')
                        ),
  dpe_valeur            integer,
  ges_lettre            text constraint biens_maisons_ges_check check (
                          ges_lettre in ('A','B','C','D','E','F','G')
                        ),
  ges_valeur            integer,

  -- Fiscalité
  taxe_fonciere         integer,

  -- Spécifique appartement (null pour maisons)
  charges_mensuelles    integer,
  syndic                varchar(100),

  -- Honoraires
  honoraires_charge     text constraint biens_maisons_hono_check check (
                          honoraires_charge in ('vendeur','acquereur','partage')
                        ),
  honoraires_montant    decimal(10,2),
  honoraires_pct        decimal(5,2),

  -- Évolutivité
  metadata              jsonb not null default '{}'::jsonb,
  updated_at            timestamptz not null default now()
);

create trigger update_biens_maisons_updated_at
  before update on public.biens_maisons
  for each row execute function update_updated_at_column();

alter table public.biens_maisons enable row level security;

create policy "biens_maisons_access"
  on public.biens_maisons for all
  to authenticated
  using (
    exists (
      select 1 from public.biens
      where id = biens_maisons.bien_id
        and user_id = auth.uid()
    )
  );


-- ============================================================
-- TABLE : biens_appartements
-- (structure identique à biens_maisons)
-- ============================================================

create table public.biens_appartements (
  id                    uuid primary key default gen_random_uuid(),
  bien_id               uuid not null unique
                        references public.biens(id)
                        on delete cascade,

  -- Pièces
  nb_pieces             integer,
  nb_chambres           integer,
  nb_sdb                integer,
  nb_sde                integer,
  nb_wc                 integer,
  nb_niveaux            integer,
  etage                 integer,
  nb_etages_immo        integer,

  -- État
  etat_general          text constraint biens_apparts_etat_check check (
                          etat_general in ('neuf','tres_bon','bon',
                                           'a_rafraichir','a_renover','a_demolir')
                        ),
  travaux               boolean,
  montant_travaux       decimal(10,2),
  annee_construction    integer,

  -- Équipements
  garage                boolean,
  nb_garages            integer,
  parking               boolean,
  nb_parkings           integer,
  cave                  boolean,
  grenier               boolean,
  sous_sol              boolean,
  piscine               boolean,
  terrain_clos          boolean,

  -- Chauffage & énergie
  type_chauffage        text constraint biens_apparts_chauffage_check check (
                          type_chauffage in ('gaz','electrique','fioul',
                                             'bois','pompe_chaleur','autre')
                        ),
  dpe_lettre            text constraint biens_apparts_dpe_check check (
                          dpe_lettre in ('A','B','C','D','E','F','G')
                        ),
  dpe_valeur            integer,
  ges_lettre            text constraint biens_apparts_ges_check check (
                          ges_lettre in ('A','B','C','D','E','F','G')
                        ),
  ges_valeur            integer,

  -- Fiscalité
  taxe_fonciere         integer,

  -- Spécifique appartement
  charges_mensuelles    integer,
  syndic                varchar(100),

  -- Honoraires
  honoraires_charge     text constraint biens_apparts_hono_check check (
                          honoraires_charge in ('vendeur','acquereur','partage')
                        ),
  honoraires_montant    decimal(10,2),
  honoraires_pct        decimal(5,2),

  -- Évolutivité
  metadata              jsonb not null default '{}'::jsonb,
  updated_at            timestamptz not null default now()
);

create trigger update_biens_appartements_updated_at
  before update on public.biens_appartements
  for each row execute function update_updated_at_column();

alter table public.biens_appartements enable row level security;

create policy "biens_appartements_access"
  on public.biens_appartements for all
  to authenticated
  using (
    exists (
      select 1 from public.biens
      where id = biens_appartements.bien_id
        and user_id = auth.uid()
    )
  );


-- ============================================================
-- TABLE : biens_terrains
-- ============================================================

create table public.biens_terrains (
  id                        uuid primary key default gen_random_uuid(),
  bien_id                   uuid not null unique
                            references public.biens(id)
                            on delete cascade,

  surface_totale            decimal(10,2),
  surface_constructible     decimal(10,2),
  constructible             boolean,
  viabilise                 boolean,
  raccorde_eau              boolean,
  raccorde_elec             boolean,
  raccorde_gaz              boolean,
  raccorde_assainissement   boolean,
  zone_plu                  varchar(50),
  servitude                 boolean,
  descriptif_servitude      text,

  metadata                  jsonb not null default '{}'::jsonb,
  updated_at                timestamptz not null default now()
);

create trigger update_biens_terrains_updated_at
  before update on public.biens_terrains
  for each row execute function update_updated_at_column();

alter table public.biens_terrains enable row level security;

create policy "biens_terrains_access"
  on public.biens_terrains for all
  to authenticated
  using (
    exists (
      select 1 from public.biens
      where id = biens_terrains.bien_id
        and user_id = auth.uid()
    )
  );


-- ============================================================
-- TABLE : biens_immeubles
-- ============================================================

create table public.biens_immeubles (
  id                    uuid primary key default gen_random_uuid(),
  bien_id               uuid not null unique
                        references public.biens(id)
                        on delete cascade,

  nb_lots_total         integer,
  nb_lots_habitation    integer,
  nb_lots_commerciaux   integer,
  nb_lots_garages       integer,
  surface_totale        decimal(10,2),
  rendement_brut        decimal(5,2),
  loyers_annuels        decimal(10,2),
  charges_annuelles     decimal(10,2),

  metadata              jsonb not null default '{}'::jsonb,
  updated_at            timestamptz not null default now()
);

create trigger update_biens_immeubles_updated_at
  before update on public.biens_immeubles
  for each row execute function update_updated_at_column();

alter table public.biens_immeubles enable row level security;

create policy "biens_immeubles_access"
  on public.biens_immeubles for all
  to authenticated
  using (
    exists (
      select 1 from public.biens
      where id = biens_immeubles.bien_id
        and user_id = auth.uid()
    )
  );


-- ============================================================
-- TABLE : biens_commerces
-- ============================================================

create table public.biens_commerces (
  id                    uuid primary key default gen_random_uuid(),
  bien_id               uuid not null unique
                        references public.biens(id)
                        on delete cascade,

  surface_totale        decimal(8,2),
  surface_vitrine       decimal(6,2),
  surface_reserve       decimal(6,2),
  type_commerce         varchar(100),
  bail_type             text constraint biens_commerces_bail_check check (
                          bail_type in ('3_6_9','precaire','autre')
                        ),
  bail_duree_restante   integer,
  loyer_mensuel         decimal(10,2),
  droit_entree          decimal(10,2),
  fonds_commerce        boolean,

  metadata              jsonb not null default '{}'::jsonb,
  updated_at            timestamptz not null default now()
);

create trigger update_biens_commerces_updated_at
  before update on public.biens_commerces
  for each row execute function update_updated_at_column();

alter table public.biens_commerces enable row level security;

create policy "biens_commerces_access"
  on public.biens_commerces for all
  to authenticated
  using (
    exists (
      select 1 from public.biens
      where id = biens_commerces.bien_id
        and user_id = auth.uid()
    )
  );
