-- ============================================================
-- ABONNEMENTS
-- Tables : abonnements_quotas, abonnements, abonnements_usage
-- ============================================================


-- ============================================================
-- TABLE : abonnements_quotas
-- Limites par plan — -1 = illimité
-- ============================================================

create table public.abonnements_quotas (
  plan                  text primary key
                        constraint abonnements_quotas_plan_check check (
                          plan in ('decouverte','solo','agence','reseau')
                        ),
  bia_par_mois          integer not null,   -- -1 = illimité
  biens_pool            integer not null,
  pools_crees           integer not null,
  stockage_mo           integer not null,
  mandats               integer not null,
  utilisateurs          integer not null
);

-- Données initiales — PRD §11.2
insert into public.abonnements_quotas
  (plan,          bia_par_mois, biens_pool, pools_crees, stockage_mo, mandats, utilisateurs)
values
  ('decouverte',  5,            2,          1,           500,         3,       1),
  ('solo',        30,           20,         3,           5120,        -1,      1),
  ('agence',      100,          -1,         -1,          25600,       -1,      5),
  ('reseau',      -1,           -1,         -1,          -1,          -1,      -1);


-- ============================================================
-- TABLE : abonnements
-- Un abonnement actif par utilisateur
-- ============================================================

create table public.abonnements (
  id                      uuid primary key default gen_random_uuid(),

  user_id                 uuid not null unique
                          references public.profiles(id)
                          on delete restrict,

  plan                    text not null default 'decouverte'
                          references public.abonnements_quotas(plan),

  statut                  text not null default 'trial'
                          constraint abonnements_statut_check check (
                            statut in ('trial','actif','expire','annule')
                          ),

  -- Stripe
  stripe_customer_id      text,
  stripe_subscription_id  text,

  -- Dates
  date_debut              timestamptz not null default now(),
  date_fin                timestamptz,
  trial_fin               timestamptz,

  -- Évolutivité
  metadata                jsonb not null default '{}'::jsonb,

  -- Horodatage
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index idx_abonnements_user_id on public.abonnements(user_id);
create index idx_abonnements_statut  on public.abonnements(statut);

create trigger update_abonnements_updated_at
  before update on public.abonnements
  for each row execute function update_updated_at_column();

alter table public.abonnements enable row level security;

create policy "abonnements_select_own"
  on public.abonnements for select
  to authenticated
  using (user_id = auth.uid());

create policy "abonnements_update_own"
  on public.abonnements for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ============================================================
-- TABLE : abonnements_usage
-- Consommation mensuelle par utilisateur
-- ============================================================

create table public.abonnements_usage (
  id                  uuid primary key default gen_random_uuid(),

  user_id             uuid not null
                      references public.profiles(id)
                      on delete restrict,

  mois                date not null,   -- 1er du mois : 2026-04-01

  bia_utilises        integer not null default 0,
  biens_pool_actifs   integer not null default 0,
  stockage_octets     bigint  not null default 0,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (user_id, mois)
);

create index idx_abonnements_usage_user_id on public.abonnements_usage(user_id);
create index idx_abonnements_usage_mois    on public.abonnements_usage(mois);

create trigger update_abonnements_usage_updated_at
  before update on public.abonnements_usage
  for each row execute function update_updated_at_column();

alter table public.abonnements_usage enable row level security;

create policy "abonnements_usage_select_own"
  on public.abonnements_usage for select
  to authenticated
  using (user_id = auth.uid());
