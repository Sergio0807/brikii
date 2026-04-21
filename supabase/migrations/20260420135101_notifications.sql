-- ============================================================
-- NOTIFICATIONS
-- Notifications in-app — cloche interface Brikii
-- ============================================================

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),

  user_id     uuid not null
              references public.profiles(id)
              on delete cascade,

  type        text not null,        -- pass_adresse_recue, bia_accepte, mandat_expire...
  titre       text not null,
  contenu     text,
  lien        text,                 -- URL interne vers la ressource concernée
  lu          boolean not null default false,

  -- Évolutivité
  metadata    jsonb not null default '{}'::jsonb,

  created_at  timestamptz not null default now()
);

create index idx_notifications_user_id  on public.notifications(user_id);
create index idx_notifications_lu       on public.notifications(user_id, lu);
create index idx_notifications_created  on public.notifications(created_at);

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications_delete_own"
  on public.notifications for delete
  to authenticated
  using (user_id = auth.uid());
