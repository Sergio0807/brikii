-- ============================================================
-- TABLE : bien_photos
-- ============================================================

create table public.bien_photos (
  id                  uuid primary key default gen_random_uuid(),
  bien_id             uuid not null
                      references public.biens(id)
                      on delete cascade,
  cloudflare_image_id text not null,
  url                 text not null,
  ordre               integer not null default 0,
  created_at          timestamptz not null default now()
);

create index idx_bien_photos_bien_id on public.bien_photos(bien_id);

alter table public.bien_photos enable row level security;

create policy "bien_photos_access"
  on public.bien_photos for all
  to authenticated
  using (
    exists (
      select 1 from public.biens
      where id = bien_photos.bien_id
        and user_id = auth.uid()
    )
  );
