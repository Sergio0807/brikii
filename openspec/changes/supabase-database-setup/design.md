## Context

Le projet Next.js existe mais n'est pas encore connecté à Supabase. Le projet Supabase est provisionné (`https://lqgifilmqnjxmttsfbzm.supabase.co`) mais vide. Cette étape pose le socle de données avant tout développement fonctionnel.

Contraintes clés :
- RGPD : hébergement EU (Frankfurt `eu-west-1`) — déjà configuré sur le projet
- RLS obligatoire sur toutes les tables — la sécurité est architecturale, pas optionnelle
- Next.js 16 : `proxy.ts` au lieu de `middleware.ts`, API `@supabase/ssr` (pas `auth-helpers-nextjs`)
- 38 tables à créer en migrations versionnées, applicables sur dev/stg/prod

## Goals / Non-Goals

**Goals:**
- Schéma complet des 38 tables avec toutes les contraintes, FK, et colonnes standards
- RLS + policies de base sur toutes les tables
- Index B-tree et GIST PostGIS pour les performances
- Trigger `on_auth_user_created` pour créer le profil `users` automatiquement
- Clients Supabase (browser + server) et middleware Next.js 16
- Types TypeScript générés

**Non-Goals:**
- Seed de données de démonstration (hors scope)
- Policies RLS avancées des modules Pool/Documents (créées lors de leurs sprints)
- Configuration Stripe, Twilio, Resend (hors scope)
- Déploiement Supabase STAGING et PROD (ce sprint = DEV uniquement)

## Decisions

**Découpage des migrations en fichiers thématiques**
Une migration par domaine plutôt qu'un seul fichier monolithique. Facilite le debugging et le rollback partiel.
- `001_extensions.sql` — postgis, uuid-ossp, pgcrypto
- `002_users.sql` — users, agences, agence_membres + trigger auth
- `003_biens.sql` — biens + 8 tables détails
- `004_mandats.sql` — mandats, mandat_proprietaires
- `005_contacts.sql` — contacts + 5 tables liées
- `006_pass_adresses.sql` — pass_adresses, pass_templates, pass_relances
- `007_pools.sql` — pools + 4 tables liées
- `008_documents.sql` — documents, documents_requis, documents_acces
- `009_abonnements.sql` — abonnements + 6 tables liées
- `010_notifications.sql` — notifications, alertes_biens
- `011_statistiques.sql` — stats_utilisateurs, stats_pools
- `012_systeme.sql` — nouveautes, support_tickets, support_messages, page_statut, audit_logs
- `013_rls.sql` — toutes les policies RLS
- `014_indexes.sql` — tous les index de performance

**`@supabase/ssr` au lieu de `auth-helpers-nextjs`**
`auth-helpers-nextjs` est déprécié et incompatible avec Next.js 16 App Router. `@supabase/ssr` est la bibliothèque officielle courante et supporte les Server Components et Route Handlers correctement.

**Proxy au lieu de middleware (Next.js 16)**
Next.js 16 renomme `middleware.ts` en `proxy.ts` et exporte `proxy` au lieu de `middleware`. Le runtime `edge` n'est pas supporté — utiliser Node.js runtime.

**Trigger SQL pour création du profil utilisateur**
Plutôt qu'un appel API côté client après inscription, un trigger PostgreSQL `AFTER INSERT ON auth.users` crée automatiquement le profil dans `public.users`. Élimine la fenêtre de temps où auth.users existe mais users n'existe pas encore.

**Service role uniquement côté serveur**
`SUPABASE_SERVICE_ROLE_KEY` n'est jamais exposé au navigateur. Les opérations nécessitant le bypass RLS (webhooks Stripe, cron jobs) utilisent uniquement le service role via API Routes.

## Risks / Trade-offs

**[Risque] Migrations irréversibles sur données existantes** → Les premières migrations sont appliquées sur un projet vide, le risque est nul pour ce sprint. Convention établie : jamais de `DROP` en prod, toujours des migrations additives.

**[Risque] Types TypeScript désynchronisés** → La commande `supabase gen types` doit être relancée après chaque migration. À documenter dans CLAUDE.md et à automatiser via un script npm.

**[Risque] RLS trop permissif sur les tables publiques de pools** → Les policies des modules Pool/Documents seront affinées lors de leurs sprints dédiés. Ce sprint pose uniquement les policies `owner_only` de base.

**[Trade-off] 38 tables dès le départ vs tables créées à la demande** → Choix de créer toutes les tables dès le départ : évite les migrations bloquantes plus tard, les FK sont cohérentes dès le début, et le schéma est documenté dans le code.

## Migration Plan

1. Vérifier que le projet Supabase `lqgifilmqnjxmttsfbzm` est accessible (URL + anon key dans `.env.local`)
2. Installer les dépendances : `npm install @supabase/supabase-js @supabase/ssr`
3. Initialiser la CLI Supabase : `supabase init` puis `supabase link --project-ref lqgifilmqnjxmttsfbzm`
4. Créer les 14 fichiers de migration dans `supabase/migrations/`
5. Appliquer : `supabase db push`
6. Vérifier dans le dashboard Supabase que les 38 tables + extensions sont créées
7. Générer les types : `supabase gen types typescript --project-id lqgifilmqnjxmttsfbzm > types/database.types.ts`
8. Créer `lib/supabase/client.ts`, `server.ts`, `proxy.ts`
9. Tester la connexion en local avec `npm run dev`

**Rollback :** Supabase ne supporte pas le rollback automatique de migrations. En cas de problème : supprimer et recréer le projet DEV (données de test uniquement).

## Open Questions

- La `SUPABASE_SERVICE_ROLE_KEY` sera-t-elle fournie maintenant ou configurée plus tard lors des webhooks ?
- Faut-il créer le projet `brikii-stg` (staging) dans ce sprint ou uniquement DEV ?
