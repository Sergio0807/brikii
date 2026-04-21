-- Nouvelles colonnes (avant la contrainte qui les référence)
alter table public.agences
  add column if not exists statut        text        not null default 'active',
  add column if not exists source        text        not null default 'user',
  add column if not exists siret         varchar(14),
  add column if not exists siret_verifie boolean     not null default false,
  add column if not exists demande_par   uuid        references public.profiles(id) on delete set null,
  add column if not exists sirene_data   jsonb       not null default '{}'::jsonb;

-- Rendre owner_id nullable (pour agences système Brikii)
alter table public.agences
  alter column owner_id drop not null;

-- Contrainte : owner_id obligatoire sauf pour source='brikii'
alter table public.agences
  add constraint agences_owner_or_brikii
  check (owner_id is not null or source = 'brikii');

-- Index SIRET
create unique index if not exists idx_agences_siret
  on public.agences(siret)
  where siret is not null and deleted_at is null;

-- Policy : lecture publique des agences Brikii actives
create policy "agences_select_public"
  on public.agences for select
  using (source = 'brikii' and statut = 'active' and deleted_at is null);
