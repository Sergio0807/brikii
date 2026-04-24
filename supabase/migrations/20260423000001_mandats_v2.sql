-- ============================================================
-- MANDATS V2 — Correctif statuts, bien_id nullable, nouvelles tables
-- ============================================================


-- ── 1. Corriger la contrainte de statut ──────────────────────────────────────

ALTER TABLE public.mandats DROP CONSTRAINT mandats_statut_check;
ALTER TABLE public.mandats ALTER COLUMN statut SET DEFAULT 'brouillon';
ALTER TABLE public.mandats ADD CONSTRAINT mandats_statut_check CHECK (
  statut IN ('brouillon','import_en_cours','a_completer','pret_a_valider','actif')
);

-- ── 2. Rendre bien_id nullable (parcours bidirectionnel) ──────────────────────

ALTER TABLE public.mandats DROP CONSTRAINT IF EXISTS mandats_bien_id_type_statut_key;
ALTER TABLE public.mandats ALTER COLUMN bien_id DROP NOT NULL;

-- ── 3. Contrainte métier : statut actif ⇒ bien_id NOT NULL ───────────────────

ALTER TABLE public.mandats ADD CONSTRAINT mandats_actif_needs_bien CHECK (
  statut <> 'actif' OR bien_id IS NOT NULL
);

-- ── 4. Ajouter statut_metier (cycle de vie après activation) ─────────────────

ALTER TABLE public.mandats ADD COLUMN statut_metier text
  CONSTRAINT mandats_statut_metier_check CHECK (
    statut_metier IN ('expire','resilie','vendu','archive')
  );

-- Index partiel : un bien ne peut avoir qu'un mandat actif non terminé par type
CREATE UNIQUE INDEX mandats_bien_type_actif_unique
  ON public.mandats(bien_id, type)
  WHERE statut = 'actif' AND statut_metier IS NULL AND bien_id IS NOT NULL;


-- ── 5. TABLE : mandat_imports ─────────────────────────────────────────────────

CREATE TABLE public.mandat_imports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete restrict,
  source_url    text not null,
  status        text not null default 'pending'
                constraint mandat_imports_status_check
                check (status in ('pending','processing','completed','error')),
  mandat_id     uuid references public.mandats(id) on delete set null,
  error_message text,
  n8n_payload   jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

CREATE INDEX idx_mandat_imports_user_id ON public.mandat_imports(user_id);
CREATE INDEX idx_mandat_imports_status  ON public.mandat_imports(status);

CREATE TRIGGER update_mandat_imports_updated_at
  BEFORE UPDATE ON public.mandat_imports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.mandat_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mandat_imports_select_own"
  ON public.mandat_imports FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "mandat_imports_insert_own"
  ON public.mandat_imports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "mandat_imports_update_own"
  ON public.mandat_imports FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());


-- ── 6. TABLE : mandat_documents ───────────────────────────────────────────────

CREATE TABLE public.mandat_documents (
  id          uuid primary key default gen_random_uuid(),
  mandat_id   uuid not null references public.mandats(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete restrict,
  type        text not null default 'mandat_pdf',
  nom         text not null,
  url         text not null,
  taille      integer,
  created_at  timestamptz not null default now()
);

CREATE INDEX idx_mandat_documents_mandat_id ON public.mandat_documents(mandat_id);

ALTER TABLE public.mandat_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mandat_documents_access"
  ON public.mandat_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mandats
      WHERE id = mandat_documents.mandat_id
        AND user_id = auth.uid()
    )
  );


-- ── 7. TABLE : mandat_events ──────────────────────────────────────────────────

CREATE TABLE public.mandat_events (
  id          uuid primary key default gen_random_uuid(),
  mandat_id   uuid not null references public.mandats(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete restrict,
  type        text not null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

CREATE INDEX idx_mandat_events_mandat_id ON public.mandat_events(mandat_id);

ALTER TABLE public.mandat_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mandat_events_access"
  ON public.mandat_events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mandats
      WHERE id = mandat_events.mandat_id
        AND user_id = auth.uid()
    )
  );
