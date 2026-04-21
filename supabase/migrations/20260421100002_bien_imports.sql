-- ============================================================
-- TABLE : bien_imports
-- Suivi du cycle de vie des imports asynchrones via n8n
-- ============================================================

create table public.bien_imports (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null
                  references public.profiles(id)
                  on delete restrict,
  source_url      text not null,
  status          text not null default 'pending'
                  constraint bien_imports_status_check
                  check (status in ('pending','scraping','mapping','completed','error')),
  bien_id         uuid references public.biens(id) on delete set null,
  error_message   text,
  n8n_payload     jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_bien_imports_user_id on public.bien_imports(user_id);
create index idx_bien_imports_status  on public.bien_imports(status);

create trigger update_bien_imports_updated_at
  before update on public.bien_imports
  for each row execute function update_updated_at_column();

alter table public.bien_imports enable row level security;

create policy "bien_imports_select_own"
  on public.bien_imports for select
  to authenticated
  using (user_id = auth.uid());

create policy "bien_imports_insert_own"
  on public.bien_imports for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "bien_imports_update_own"
  on public.bien_imports for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
