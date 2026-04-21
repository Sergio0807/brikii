-- Contrainte trop stricte : bloque l'inscription si agence_mandant_id n'est pas encore renseigné
alter table public.profiles drop constraint if exists profiles_agence_mandant_obligatoire;
