## Why

Toute la plateforme Brikii repose sur PostgreSQL via Supabase. Avant d'écrire la moindre ligne de code applicatif, le schéma complet des 38 tables doit exister avec RLS, extensions et indexes — c'est le socle de sécurité et de performance de toute l'application.

## What Changes

- Initialisation du projet Supabase (URL : `https://lqgifilmqnjxmttsfbzm.supabase.co`)
- Activation des extensions PostgreSQL : `postgis`, `uuid-ossp`, `pgcrypto`
- Création des migrations SQL versionnées dans `supabase/migrations/`
- Schéma complet des 38 tables réparties en 11 domaines
- Row Level Security (RLS) activé sur toutes les tables avec policies de base
- Index de performance sur les colonnes de recherche fréquente
- Index géographique PostGIS pour les requêtes de rayon (pools, alertes biens)
- Trigger SQL pour la création automatique du profil `users` à l'inscription Supabase Auth
- Configuration du client Supabase dans le projet Next.js (`lib/supabase/`)
- Génération des types TypeScript depuis le schéma (`types/database.types.ts`)
- Variables d'environnement Supabase dans `.env.local`

## Capabilities

### New Capabilities

- `database-schema`: Schéma complet des 38 tables PostgreSQL avec toutes les contraintes, colonnes standards (id, created_at, updated_at, deleted_at, metadata) et relations
- `database-rls`: Policies Row Level Security sur toutes les tables — chaque utilisateur n'accède qu'à ses propres données
- `database-indexes`: Index de performance (colonnes fréquentes + index géographique GIST PostGIS)
- `supabase-client`: Configuration des clients Supabase pour Next.js (browser, server, middleware auth)
- `database-types`: Types TypeScript auto-générés depuis le schéma Supabase

### Modified Capabilities

_(aucune — première mise en place)_

## Impact

- `supabase/migrations/` — fichiers SQL numérotés créés (001 à ~015)
- `lib/supabase/client.ts` — client navigateur
- `lib/supabase/server.ts` — client serveur (Server Components / API Routes)
- `lib/supabase/middleware.ts` — vérification session
- `types/database.types.ts` — types TypeScript (généré CLI)
- `.env.local` — variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Dépendances npm : `@supabase/supabase-js`, `@supabase/ssr`
