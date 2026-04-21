-- ============================================================
-- PASS'ADRESSES — TABLE : pass_relances
-- Relances automatiques email/SMS liées à une demande BIA
-- ============================================================

create table public.pass_relances (
  id                uuid primary key default gen_random_uuid(),

  pass_adresse_id   uuid not null
                    references public.pass_adresses(id)
                    on delete cascade,

  type              varchar(10) not null
                    constraint pass_relances_type_check check (
                      type in ('email','sms')
                    ),

  numero_relance    integer not null,   -- 1, 2, 3...

  statut            varchar(20) not null default 'planifiee'
                    constraint pass_relances_statut_check check (
                      statut in ('planifiee','envoyee','echec')
                    ),

  scheduled_at      timestamptz,
  sent_at           timestamptz,
  erreur            text,

  created_at        timestamptz not null default now(),

  unique (pass_adresse_id, numero_relance, type)
);

create index idx_pass_relances_pass_adresse_id on public.pass_relances(pass_adresse_id);
create index idx_pass_relances_statut          on public.pass_relances(statut);
create index idx_pass_relances_scheduled_at    on public.pass_relances(scheduled_at);

alter table public.pass_relances enable row level security;

create policy "pass_relances_access"
  on public.pass_relances for all
  to authenticated
  using (
    exists (
      select 1 from public.pass_adresses
      where id = pass_relances.pass_adresse_id
        and user_id = auth.uid()
    )
  );
