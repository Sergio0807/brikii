-- S'assurer que toutes les colonnes référencées par le trigger existent
alter table public.profiles
  add column if not exists prenom               text,
  add column if not exists nom                  text,
  add column if not exists telephone            text,
  add column if not exists statut_professionnel text;
