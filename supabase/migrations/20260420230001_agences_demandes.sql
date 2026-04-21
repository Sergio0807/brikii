create table public.agences_demandes (
  id            uuid        primary key default gen_random_uuid(),

  siret         varchar(14) not null,
  nom           text        not null,
  ville         text,
  contact_email text        not null,
  contact_nom   text,

  statut        text        not null default 'pending',  -- pending, approuve, refuse

  demande_par   uuid        references public.profiles(id) on delete set null,
  traite_par    uuid        references public.profiles(id) on delete set null,

  notes_admin   text,
  metadata      jsonb       not null default '{}'::jsonb,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Index
create index idx_agences_demandes_siret    on public.agences_demandes(siret);
create index idx_agences_demandes_statut   on public.agences_demandes(statut);
create index idx_agences_demandes_demandeur on public.agences_demandes(demande_par);

-- Trigger updated_at
create trigger update_agences_demandes_updated_at
  before update on public.agences_demandes
  for each row execute function update_updated_at_column();

-- RLS
alter table public.agences_demandes enable row level security;

create policy "agences_demandes_select_own"
  on public.agences_demandes for select
  to authenticated
  using (demande_par = auth.uid());

create policy "agences_demandes_insert_own"
  on public.agences_demandes for insert
  to authenticated
  with check (demande_par = auth.uid());
