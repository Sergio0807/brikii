-- ============================================================
-- SIMPLIFICATION VOLONTAIRE DU MODÈLE AGENCES
-- Date : 2026-04-20
--
-- Objectif : supprimer la table agence_membres (trop complexe
-- pour l'étape actuelle) et porter le rattachement agence
-- directement sur profiles via une FK simple.
--
-- Pourra être re-modélisé plus tard si les besoins multi-agences
-- ou de gestion avancée des membres deviennent nécessaires.
-- ============================================================


-- ============================================================
-- 1. SUPPRESSION de agence_membres et de ses dépendances
-- ============================================================

-- Trigger unicité (migration 3 non pushée — drop if exists par sécurité)
drop trigger if exists trg_unicite_agence_par_professionnel on public.agence_membres;
drop function if exists public.check_unicite_agence_par_professionnel();

-- Policies
drop policy if exists "agence_membres_select_own"    on public.agence_membres;
drop policy if exists "agence_membres_insert_owner"  on public.agence_membres;
drop policy if exists "agence_membres_update_owner"  on public.agence_membres;
drop policy if exists "agence_membres_delete_owner"  on public.agence_membres;

-- Trigger updated_at
drop trigger if exists update_agence_membres_updated_at on public.agence_membres;

-- Table (cascade supprime indexes et contraintes)
drop table if exists public.agence_membres cascade;


-- ============================================================
-- 2. MISE À JOUR de profiles
--    - supprime agence_mandant (text libre, remplacé par FK)
--    - ajoute agence_mandant_id (FK vers agences)
--    - contrainte CHECK : les statuts professionnels réglementés
--      doivent obligatoirement être rattachés à une agence
-- ============================================================

alter table public.profiles
  drop column if exists agence_mandant;

alter table public.profiles
  add column agence_mandant_id uuid
    references public.agences(id)
    on delete set null;

-- Un agent_immobilier, mandataire ou negociateur doit
-- obligatoirement avoir une agence mandante renseignée.
alter table public.profiles
  add constraint profiles_agence_mandant_obligatoire
  check (
    statut_professionnel not in ('agent_immobilier', 'mandataire', 'negociateur')
    or agence_mandant_id is not null
  );

create index idx_profiles_agence_mandant_id
  on public.profiles(agence_mandant_id);


-- ============================================================
-- 3. MISE À JOUR RLS sur agences
--    Un profil peut lire l'agence à laquelle il est rattaché
--    (pas seulement l'owner)
-- ============================================================

drop policy if exists "agences_select_own" on public.agences;

create policy "agences_select_own_or_rattache"
  on public.agences for select
  to authenticated
  using (
    deleted_at is null
    and (
      owner_id = auth.uid()
      or exists (
        select 1 from public.profiles
        where id = auth.uid()
          and agence_mandant_id = agences.id
      )
    )
  );
