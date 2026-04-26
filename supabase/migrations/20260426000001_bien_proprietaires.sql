-- ============================================================
-- BIEN_PROPRIETAIRES
-- Source de vérité juridique des propriétaires d'un bien.
-- Distinct de contact_biens (CRM) et mandat_proprietaires
-- (photographie contractuelle).
--
-- Modifications connexes :
--   - mandat_proprietaires : ajout colonnes juridiques,
--     remplacement contrainte unique, correction RLS
-- ============================================================


-- ============================================================
-- TABLE : bien_proprietaires
-- ============================================================

create table public.bien_proprietaires (
  id                          uuid        primary key default gen_random_uuid(),

  bien_id                     uuid        not null
                              references public.biens(id)
                              on delete cascade,

  contact_id                  uuid        not null
                              references public.contacts(id)
                              on delete restrict,

  -- Représentant légal, gérant de SCI, tuteur, mandataire...
  -- Lui-même un contact enregistré dans le carnet d'adresses.
  representant_contact_id     uuid
                              references public.contacts(id)
                              on delete set null,

  -- Nature du droit de propriété
  nature_droit                text        not null default 'pleine_propriete'
                              constraint bien_proprietaires_nature_droit_check check (
                                nature_droit in (
                                  'pleine_propriete',
                                  'usufruit',
                                  'nue_propriete',
                                  'indivision'
                                )
                              ),

  -- Quote-part : renseignée ensemble ou pas du tout
  quote_part_numerateur       smallint
                              constraint bien_proprietaires_quote_part_positif_check check (
                                quote_part_numerateur > 0
                              ),
  quote_part_denominateur     smallint
                              constraint bien_proprietaires_quote_part_denom_check check (
                                quote_part_denominateur > 0
                              ),

  -- Cohérence : les deux champs sont renseignés ou aucun
  constraint bien_proprietaires_quote_part_coherence check (
    (quote_part_numerateur is null) = (quote_part_denominateur is null)
  ),

  -- Date d'entrée dans la propriété (succession, achat, donation...)
  date_entree                 date,

  -- Ordre d'affichage
  ordre                       smallint    not null default 0,

  -- Extensibilité
  metadata                    jsonb       not null default '{}'::jsonb,

  -- Horodatage
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  -- Un même contact ne peut détenir le même droit qu'une fois par bien
  constraint bien_proprietaires_unique unique (bien_id, contact_id, nature_droit)
);


-- ── Index ─────────────────────────────────────────────────────────────────────

create index idx_bien_proprietaires_bien_id
  on public.bien_proprietaires(bien_id);

create index idx_bien_proprietaires_contact_id
  on public.bien_proprietaires(contact_id);

create index idx_bien_proprietaires_representant
  on public.bien_proprietaires(representant_contact_id)
  where representant_contact_id is not null;


-- ── Trigger updated_at ────────────────────────────────────────────────────────

create trigger update_bien_proprietaires_updated_at
  before update on public.bien_proprietaires
  for each row execute function update_updated_at_column();


-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.bien_proprietaires enable row level security;

-- Condition partagée : l'utilisateur est propriétaire du bien (l'agent)
-- SELECT
create policy "bien_proprietaires_select"
  on public.bien_proprietaires for select
  to authenticated
  using (
    exists (
      select 1 from public.biens
      where id = bien_proprietaires.bien_id
        and user_id = auth.uid()
        and deleted_at is null
    )
  );

-- INSERT
create policy "bien_proprietaires_insert"
  on public.bien_proprietaires for insert
  to authenticated
  with check (
    exists (
      select 1 from public.biens
      where id = bien_proprietaires.bien_id
        and user_id = auth.uid()
        and deleted_at is null
    )
  );

-- UPDATE
create policy "bien_proprietaires_update"
  on public.bien_proprietaires for update
  to authenticated
  using (
    exists (
      select 1 from public.biens
      where id = bien_proprietaires.bien_id
        and user_id = auth.uid()
        and deleted_at is null
    )
  )
  with check (
    exists (
      select 1 from public.biens
      where id = bien_proprietaires.bien_id
        and user_id = auth.uid()
        and deleted_at is null
    )
  );

-- DELETE
create policy "bien_proprietaires_delete"
  on public.bien_proprietaires for delete
  to authenticated
  using (
    exists (
      select 1 from public.biens
      where id = bien_proprietaires.bien_id
        and user_id = auth.uid()
        and deleted_at is null
    )
  );


-- ============================================================
-- MODIFICATIONS : mandat_proprietaires
-- ============================================================


-- ── 1. Colonnes ajoutées ──────────────────────────────────────────────────────

alter table public.mandat_proprietaires
  add column nature_droit text not null default 'pleine_propriete'
    constraint mandat_proprietaires_nature_droit_check check (
      nature_droit in (
        'pleine_propriete',
        'usufruit',
        'nue_propriete',
        'indivision'
      )
    );

alter table public.mandat_proprietaires
  add column quote_part_numerateur smallint
    constraint mandat_proprietaires_qp_num_check check (quote_part_numerateur > 0);

alter table public.mandat_proprietaires
  add column quote_part_denominateur smallint
    constraint mandat_proprietaires_qp_den_check check (quote_part_denominateur > 0);

alter table public.mandat_proprietaires
  add constraint mandat_proprietaires_quote_part_coherence check (
    (quote_part_numerateur is null) = (quote_part_denominateur is null)
  );

alter table public.mandat_proprietaires
  add column representant_contact_id uuid
    references public.contacts(id)
    on delete set null;

alter table public.mandat_proprietaires
  add column source_bien_proprietaire_id uuid
    references public.bien_proprietaires(id)
    on delete set null;


-- ── 2. Contrainte unique : remplace (mandat_id, contact_id) ──────────────────

alter table public.mandat_proprietaires
  drop constraint if exists mandat_proprietaires_mandat_id_contact_id_key;

alter table public.mandat_proprietaires
  add constraint mandat_proprietaires_unique
  unique (mandat_id, contact_id, nature_droit);


-- ── 3. RLS : correction et complétion ────────────────────────────────────────
-- La politique FOR ALL existante n'avait pas de WITH CHECK pour les INSERT.
-- On la remplace par quatre politiques distinctes.

drop policy if exists "mandat_proprietaires_access" on public.mandat_proprietaires;

-- SELECT
create policy "mandat_proprietaires_select"
  on public.mandat_proprietaires for select
  to authenticated
  using (
    exists (
      select 1 from public.mandats
      where id = mandat_proprietaires.mandat_id
        and user_id = auth.uid()
    )
  );

-- INSERT
create policy "mandat_proprietaires_insert"
  on public.mandat_proprietaires for insert
  to authenticated
  with check (
    exists (
      select 1 from public.mandats
      where id = mandat_proprietaires.mandat_id
        and user_id = auth.uid()
    )
  );

-- UPDATE
create policy "mandat_proprietaires_update"
  on public.mandat_proprietaires for update
  to authenticated
  using (
    exists (
      select 1 from public.mandats
      where id = mandat_proprietaires.mandat_id
        and user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.mandats
      where id = mandat_proprietaires.mandat_id
        and user_id = auth.uid()
    )
  );

-- DELETE
create policy "mandat_proprietaires_delete"
  on public.mandat_proprietaires for delete
  to authenticated
  using (
    exists (
      select 1 from public.mandats
      where id = mandat_proprietaires.mandat_id
        and user_id = auth.uid()
    )
  );
