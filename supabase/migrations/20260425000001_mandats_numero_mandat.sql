-- Ajout du numéro de mandat métier (celui inscrit sur le document papier/PDF)
-- Nullable, sans contrainte d'unicité (plusieurs agents peuvent avoir le même numéro)

ALTER TABLE public.mandats
  ADD COLUMN IF NOT EXISTS numero_mandat text;
