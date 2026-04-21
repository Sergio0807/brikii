-- ============================================================
-- MANDATS
-- Note : mandat_proprietaires (liaison vers contacts) sera
-- créé avec la table contacts dans une migration ultérieure.
-- ============================================================


-- ============================================================
-- FONCTION : calcul automatique de date_fin
-- date_fin = date_debut + duree_mois
-- ============================================================

create or replace function public.compute_mandat_date_fin()
returns trigger
language plpgsql
as $$
begin
  if new.date_debut is not null and new.duree_mois is not null then
    new.date_fin := new.date_debut + (new.duree_mois || ' months')::interval;
  end if;
  return new;
end;
$$;


-- ============================================================
-- TABLE : mandats
-- ============================================================

create table public.mandats (
  id                    uuid primary key default gen_random_uuid(),

  -- Identité
  numero                varchar(50) not null,
  user_id               uuid not null
                        references public.profiles(id)
                        on delete restrict,
  bien_id               uuid not null
                        references public.biens(id)
                        on delete restrict,

  -- Type
  type                  text not null
                        constraint mandats_type_check check (
                          type in ('exclusif','simple','semi_exclusif',
                                   'recherche','gestion')
                        ),

  -- Dates
  date_signature        date not null,
  date_debut            date not null,
  date_fin              date,           -- calculée automatiquement
  duree_mois            integer,
  reconductible         boolean default true,

  -- Statut
  statut                text not null default 'en_cours'
                        constraint mandats_statut_check check (
                          statut in ('en_cours','expire','resilie',
                                     'suspendu','vendu','archive')
                        ),

  -- Prix et honoraires
  prix_vente            decimal(12,2) not null,
  prix_hono_inclus      boolean default false,
  honoraires_charge     text constraint mandats_hono_charge_check check (
                          honoraires_charge in ('vendeur','acquereur','partage')
                        ),
  honoraires_pct        decimal(5,2),
  honoraires_montant    decimal(10,2),

  -- Rétrocession pool
  taux_retrocession     decimal(5,2),

  -- Clauses
  clauses               text,

  -- Document PDF
  document_url          text,

  -- Alertes expiration (flags pour éviter les doublons d'envoi)
  alerte_30j_envoyee    boolean default false,
  alerte_15j_envoyee    boolean default false,
  alerte_7j_envoyee     boolean default false,

  -- Évolutivité
  metadata              jsonb not null default '{}'::jsonb,

  -- Horodatage
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,

  -- Un bien ne peut avoir qu'un mandat actif du même type
  unique (bien_id, type, statut)
);

create index idx_mandats_user_id  on public.mandats(user_id);
create index idx_mandats_bien_id  on public.mandats(bien_id);
create index idx_mandats_statut   on public.mandats(statut);
create index idx_mandats_date_fin on public.mandats(date_fin);

-- Calcul automatique de date_fin à l'insert et à l'update
create trigger trg_mandats_date_fin
  before insert or update of date_debut, duree_mois
  on public.mandats
  for each row execute function public.compute_mandat_date_fin();

create trigger update_mandats_updated_at
  before update on public.mandats
  for each row execute function update_updated_at_column();

alter table public.mandats enable row level security;

create policy "mandats_select_own"
  on public.mandats for select
  to authenticated
  using (user_id = auth.uid() and deleted_at is null);

create policy "mandats_insert_own"
  on public.mandats for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "mandats_update_own"
  on public.mandats for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "mandats_delete_own"
  on public.mandats for delete
  to authenticated
  using (user_id = auth.uid());
