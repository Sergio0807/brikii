## ADDED Requirements

### Requirement: Client Supabase navigateur (composants client)
Le système SHALL exposer un client Supabase initialisé avec `@supabase/ssr` pour les composants React côté navigateur (`'use client'`).

#### Scenario: Composant client accède à Supabase
- **WHEN** un composant avec `'use client'` importe `lib/supabase/client.ts`
- **THEN** un client Supabase valide est disponible avec la session de l'utilisateur courant

### Requirement: Client Supabase serveur (Server Components et API Routes)
Le système SHALL exposer un client Supabase côté serveur utilisant les cookies Next.js pour les Server Components et Route Handlers.

#### Scenario: Server Component lit des données
- **WHEN** un Server Component importe `lib/supabase/server.ts`
- **THEN** le client lit les cookies de session et exécute les requêtes avec le contexte utilisateur correct

### Requirement: Middleware d'authentification Next.js
Le système SHALL implémenter un middleware dans `proxy.ts` (Next.js 16) qui rafraîchit la session Supabase et redirige vers `/login` les routes protégées sans session valide.

#### Scenario: Accès route protégée sans session
- **WHEN** un utilisateur non authentifié accède à `/dashboard`
- **THEN** il est redirigé vers `/login?redirect=/dashboard`

#### Scenario: Accès route admin sans rôle admin
- **WHEN** un utilisateur standard accède à `/admin`
- **THEN** il est redirigé vers `/dashboard`

#### Scenario: Session rafraîchie automatiquement
- **WHEN** le refresh token est encore valide mais le JWT est expiré
- **THEN** le middleware rafraîchit silencieusement la session sans rediriger l'utilisateur

### Requirement: Variables d'environnement Supabase configurées
Le système SHALL documenter et valider la présence des variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` au démarrage.

#### Scenario: Variable manquante au démarrage
- **WHEN** `NEXT_PUBLIC_SUPABASE_URL` est absent de l'environnement
- **THEN** une erreur explicite est levée au démarrage de l'application
