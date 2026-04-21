-- ============================================================
-- CONTACTS & CARNET D'ADRESSES
-- Tables : contact_types, contacts, contact_roles,
--          contact_biens, contact_interactions,
--          contact_alertes_biens, contact_rappels,
--          mandat_proprietaires
-- ============================================================


-- ============================================================
-- TABLE : contact_types
-- Table de référence — types prédéfinis au lancement
-- ============================================================

create table public.contact_types (
  code        varchar(50) primary key,
  label       varchar(100) not null,
  categorie   varchar(50)  not null,
  ordre       integer      not null default 0
);

insert into public.contact_types (code, label, categorie, ordre) values
  -- Particuliers
  ('proprietaire_vendeur',   'Propriétaire vendeur',   'particulier', 10),
  ('proprietaire_bailleur',  'Propriétaire bailleur',  'particulier', 20),
  ('locataire',              'Locataire',               'particulier', 30),
  ('acquereur',              'Acquéreur',               'particulier', 40),
  ('prospect_acquereur',     'Prospect acquéreur',      'particulier', 50),
  ('prospect_vendeur',       'Prospect vendeur',        'particulier', 60),
  -- Professionnels immobilier
  ('agent_immobilier',       'Agent immobilier',        'pro_immo',    10),
  ('mandataire',             'Mandataire',              'pro_immo',    20),
  ('negociateur',            'Négociateur',             'pro_immo',    30),
  ('notaire',                'Notaire',                 'pro_immo',    40),
  ('gestionnaire',           'Gestionnaire',            'pro_immo',    50),
  -- Professionnels techniques
  ('diagnostiqueur',         'Diagnostiqueur',          'pro_tech',    10),
  ('geometre',               'Géomètre',                'pro_tech',    20),
  ('architecte',             'Architecte',              'pro_tech',    30),
  ('artisan_maconnerie',     'Artisan maçonnerie',      'pro_tech',    40),
  ('artisan_electricite',    'Artisan électricité',     'pro_tech',    50),
  ('artisan_plomberie',      'Artisan plomberie',       'pro_tech',    60),
  ('artisan_autre',          'Artisan autre',           'pro_tech',    70),
  ('expert_immobilier',      'Expert immobilier',       'pro_tech',    80),
  -- Juridique / Financier
  ('avocat',                 'Avocat',                  'juridique',   10),
  ('huissier',               'Huissier',                'juridique',   20),
  ('banquier',               'Banquier',                'juridique',   30),
  ('courtier_credit',        'Courtier crédit',         'juridique',   40),
  ('assureur',               'Assureur',                'juridique',   50),
  ('comptable',              'Comptable',               'juridique',   60),
  -- Autre
  ('autre',                  'Autre',                   'autre',        0);


-- ============================================================
-- TABLE : contacts
-- ============================================================

create table public.contacts (
  id                    uuid primary key default gen_random_uuid(),

  user_id               uuid not null
                        references public.profiles(id)
                        on delete restrict,

  -- Type de personne
  personne_type         text not null default 'physique'
                        constraint contacts_personne_type_check check (
                          personne_type in ('physique','morale')
                        ),

  -- Personne physique
  civilite              text constraint contacts_civilite_check check (
                          civilite in ('monsieur','madame')
                        ),
  prenom                varchar(100),
  nom                   varchar(100),
  date_naissance        date,
  lieu_naissance        varchar(100),
  nationalite           varchar(50),

  -- Personne morale
  raison_sociale        varchar(255),
  forme_juridique       varchar(50),
  siren                 varchar(14),
  representant_nom      varchar(255),
  representant_qualite  varchar(100),

  -- Coordonnées
  email                 varchar(255),
  telephone             varchar(20),
  telephone_2           varchar(20),
  adresse               varchar(255),
  ville                 varchar(100),
  code_postal           varchar(10),
  pays                  varchar(50) default 'France',

  -- Types (snapshot dénormalisé pour affichage rapide)
  types                 text[],

  -- Visuel
  photo_url             text,

  -- Origine
  origine               text constraint contacts_origine_check check (
                          origine in ('saisie_manuelle','import','pass_adresses',
                                      'pools','site_web','recommandation','autre')
                        ),
  origine_detail        varchar(255),

  -- Scoring prospect
  score                 text constraint contacts_score_check check (
                          score in ('A','B','C','D')
                        ),
  score_detail          jsonb,

  -- Statut
  statut                text not null default 'actif'
                        constraint contacts_statut_check check (
                          statut in ('actif','inactif','archive')
                        ),

  -- Tags libres
  tags                  text[],

  -- Déduplication
  doublon_detecte       boolean default false,
  doublon_contact_id    uuid,               -- auto-référence, FK ajoutée après

  -- Notes libres
  notes                 text,

  -- Évolutivité
  metadata              jsonb not null default '{}'::jsonb,

  -- Horodatage
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

-- FK auto-référence doublon (après création de la table)
alter table public.contacts
  add constraint contacts_doublon_contact_id_fk
  foreign key (doublon_contact_id)
  references public.contacts(id)
  on delete set null;

create index idx_contacts_user_id    on public.contacts(user_id);
create index idx_contacts_email      on public.contacts(email);
create index idx_contacts_telephone  on public.contacts(telephone);
create index idx_contacts_statut     on public.contacts(statut);

create trigger update_contacts_updated_at
  before update on public.contacts
  for each row execute function update_updated_at_column();

alter table public.contacts enable row level security;

create policy "contacts_select_own"
  on public.contacts for select
  to authenticated
  using (user_id = auth.uid() and deleted_at is null);

create policy "contacts_insert_own"
  on public.contacts for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "contacts_update_own"
  on public.contacts for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "contacts_delete_own"
  on public.contacts for delete
  to authenticated
  using (user_id = auth.uid());


-- ============================================================
-- TABLE : contact_roles
-- Un contact peut avoir plusieurs rôles simultanément
-- ============================================================

create table public.contact_roles (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null
              references public.contacts(id)
              on delete cascade,
  type        varchar(50) not null
              references public.contact_types(code)
              on delete restrict,
  actif       boolean not null default true,
  created_at  timestamptz not null default now(),

  unique (contact_id, type)
);

create index idx_contact_roles_contact_id on public.contact_roles(contact_id);
create index idx_contact_roles_type       on public.contact_roles(type);

alter table public.contact_roles enable row level security;

create policy "contact_roles_access"
  on public.contact_roles for all
  to authenticated
  using (
    exists (
      select 1 from public.contacts
      where id = contact_roles.contact_id
        and user_id = auth.uid()
    )
  );


-- ============================================================
-- TABLE : contact_biens
-- Liaison contacts ↔ biens
-- ============================================================

create table public.contact_biens (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null
              references public.contacts(id)
              on delete cascade,
  bien_id     uuid not null
              references public.biens(id)
              on delete cascade,
  role        text not null
              constraint contact_biens_role_check check (
                role in ('proprietaire','coproprietaire','locataire',
                         'acquereur_potentiel','acquereur_confirme')
              ),
  created_at  timestamptz not null default now(),

  unique (contact_id, bien_id, role)
);

create index idx_contact_biens_contact_id on public.contact_biens(contact_id);
create index idx_contact_biens_bien_id    on public.contact_biens(bien_id);

alter table public.contact_biens enable row level security;

create policy "contact_biens_access"
  on public.contact_biens for all
  to authenticated
  using (
    exists (
      select 1 from public.contacts
      where id = contact_biens.contact_id
        and user_id = auth.uid()
    )
  );


-- ============================================================
-- TABLE : contact_interactions
-- Historique des interactions avec un contact
-- ============================================================

create table public.contact_interactions (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null
              references public.contacts(id)
              on delete cascade,
  user_id     uuid not null
              references public.profiles(id)
              on delete restrict,
  type        text not null
              constraint contact_interactions_type_check check (
                type in ('appel','email','sms','visite','rdv',
                         'note','pass_adresse','autre')
              ),
  titre       varchar(255),
  contenu     text,
  date_inter  timestamptz,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index idx_contact_interactions_contact_id on public.contact_interactions(contact_id);
create index idx_contact_interactions_date       on public.contact_interactions(date_inter);

alter table public.contact_interactions enable row level security;

create policy "contact_interactions_access"
  on public.contact_interactions for all
  to authenticated
  using (
    exists (
      select 1 from public.contacts
      where id = contact_interactions.contact_id
        and user_id = auth.uid()
    )
  );


-- ============================================================
-- TABLE : contact_alertes_biens
-- Critères de recherche prospect pour alertes automatiques
-- ============================================================

create table public.contact_alertes_biens (
  id                uuid primary key default gen_random_uuid(),
  contact_id        uuid not null
                    references public.contacts(id)
                    on delete cascade,

  -- Critères bien
  types_biens       text[],
  prix_min          integer,
  prix_max          integer,
  surface_min       integer,
  surface_hab_min   integer,
  nb_pieces_min     integer,

  -- Zone géographique
  zone_ville        varchar(100),
  zone_code_postal  varchar(10),
  zone_lat          decimal(10,8),
  zone_lng          decimal(11,8),
  zone_rayon_km     integer,

  -- Statut
  actif             boolean not null default true,

  -- Évolutivité
  metadata          jsonb not null default '{}'::jsonb,

  -- Horodatage
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_contact_alertes_contact_id on public.contact_alertes_biens(contact_id);

create trigger update_contact_alertes_biens_updated_at
  before update on public.contact_alertes_biens
  for each row execute function update_updated_at_column();

alter table public.contact_alertes_biens enable row level security;

create policy "contact_alertes_biens_access"
  on public.contact_alertes_biens for all
  to authenticated
  using (
    exists (
      select 1 from public.contacts
      where id = contact_alertes_biens.contact_id
        and user_id = auth.uid()
    )
  );


-- ============================================================
-- TABLE : contact_rappels
-- ============================================================

create table public.contact_rappels (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null
              references public.contacts(id)
              on delete cascade,
  user_id     uuid not null
              references public.profiles(id)
              on delete restrict,
  titre       varchar(255),
  date_rappel timestamptz,
  statut      text not null default 'planifie'
              constraint contact_rappels_statut_check check (
                statut in ('planifie','effectue','annule')
              ),
  note        text,
  created_at  timestamptz not null default now()
);

create index idx_contact_rappels_contact_id  on public.contact_rappels(contact_id);
create index idx_contact_rappels_user_id     on public.contact_rappels(user_id);
create index idx_contact_rappels_date_rappel on public.contact_rappels(date_rappel);

alter table public.contact_rappels enable row level security;

create policy "contact_rappels_access"
  on public.contact_rappels for all
  to authenticated
  using (user_id = auth.uid());


-- ============================================================
-- TABLE : mandat_proprietaires
-- Liaison mandats ↔ contacts (propriétaires vendeurs)
-- Plusieurs propriétaires possible : couple, indivision, SCI...
-- ============================================================

create table public.mandat_proprietaires (
  id          uuid primary key default gen_random_uuid(),
  mandat_id   uuid not null
              references public.mandats(id)
              on delete cascade,
  contact_id  uuid not null
              references public.contacts(id)
              on delete restrict,
  role        text not null
              constraint mandat_proprietaires_role_check check (
                role in ('proprietaire_principal','coproprietaire',
                         'mandataire_legal','representant_sci')
              ),
  ordre       integer default 0,
  created_at  timestamptz not null default now(),

  unique (mandat_id, contact_id)
);

create index idx_mandat_proprietaires_mandat_id  on public.mandat_proprietaires(mandat_id);
create index idx_mandat_proprietaires_contact_id on public.mandat_proprietaires(contact_id);

alter table public.mandat_proprietaires enable row level security;

create policy "mandat_proprietaires_access"
  on public.mandat_proprietaires for all
  to authenticated
  using (
    exists (
      select 1 from public.mandats
      where id = mandat_proprietaires.mandat_id
        and user_id = auth.uid()
    )
  );
