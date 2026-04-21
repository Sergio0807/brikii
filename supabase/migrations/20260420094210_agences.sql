-- ============================================================
-- AGENCES & AGENCE_MEMBRES
-- ============================================================

-- ---- Fonction updated_at -----------------------------------

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


-- ============================================================
-- TABLE : agences
-- ============================================================

create table public.agences (
  id            uuid primary key default gen_random_uuid(),

  owner_id      uuid not null
                references public.profiles(id)
                on delete cascade,

  nom           text not null,

  type          text, -- agence, reseau, cabinet, independant...

  adresse       text,
  code_postal   text,
  ville         text,

  siret         text,

  logo_url      text,

  metadata      jsonb not null default '{}'::jsonb,

  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Index
create index idx_agences_owner_id on public.agences(owner_id);

-- Trigger updated_at
create trigger update_agences_updated_at
before update on public.agences
for each row execute function update_updated_at_column();

-- RLS
alter table public.agences enable row level security;

-- Policies agences

create policy "agences_select_own"
  on public.agences for select
  to authenticated
  using (owner_id = auth.uid() and deleted_at is null);

create policy "agences_insert_own"
  on public.agences for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "agences_update_own"
  on public.agences for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "agences_delete_own"
  on public.agences for delete
  to authenticated
  using (owner_id = auth.uid());


-- ============================================================
-- TABLE : agence_membres
-- ============================================================

create table public.agence_membres (
  id          uuid primary key default gen_random_uuid(),

  agence_id   uuid not null
              references public.agences(id)
              on delete cascade,

  user_id     uuid not null
              references public.profiles(id)
              on delete cascade,

  role        text not null,   -- admin, membre, negociateur...
  statut      text not null default 'actif', -- actif, inactif, suspendu

  metadata    jsonb not null default '{}'::jsonb,

  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (agence_id, user_id)
);

-- Index
create index idx_agence_membres_user_id on public.agence_membres(user_id);
create index idx_agence_membres_agence_id on public.agence_membres(agence_id);

-- Trigger updated_at
create trigger update_agence_membres_updated_at
before update on public.agence_membres
for each row execute function update_updated_at_column();

-- RLS
alter table public.agence_membres enable row level security;

-- Policies agence_membres

create policy "agence_membres_select_own"
  on public.agence_membres for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.agences
      where id = agence_membres.agence_id
        and owner_id = auth.uid()
    )
  );

create policy "agence_membres_insert_owner"
  on public.agence_membres for insert
  to authenticated
  with check (
    exists (
      select 1 from public.agences
      where id = agence_membres.agence_id
        and owner_id = auth.uid()
    )
  );

create policy "agence_membres_update_owner"
  on public.agence_membres for update
  to authenticated
  using (
    exists (
      select 1 from public.agences
      where id = agence_membres.agence_id
        and owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.agences
      where id = agence_membres.agence_id
        and owner_id = auth.uid()
    )
  );

create policy "agence_membres_delete_owner"
  on public.agence_membres for delete
  to authenticated
  using (
    exists (
      select 1 from public.agences
      where id = agence_membres.agence_id
        and owner_id = auth.uid()
    )
  );