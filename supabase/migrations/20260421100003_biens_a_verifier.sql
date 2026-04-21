-- Ajout colonne a_verifier sur biens
-- true = bien importé via n8n, relecture recommandée

alter table public.biens
  add column a_verifier boolean not null default false;
