## Why

Les pages protégées (dashboard, biens, mandats, contacts, pass-adresses) utilisent actuellement `PageLayout` de manière individuelle, sans groupe App Router commun. Il manque un layout racine partagé qui garantit la session Supabase, affiche la sidebar, et centralise la redirection vers `/login` si l'utilisateur n'est pas authentifié.

## What Changes

- Création du groupe de routes `app/(app)/` avec un `layout.tsx` serveur qui vérifie la session Supabase et redirige vers `/login` si absente
- Déplacement de `app/dashboard/` dans `app/(app)/dashboard/`
- Intégration de `PageLayout` (sidebar + header) dans le layout du groupe `(app)`
- Suppression des vérifications de session individuelles dans chaque page
- Création d'un hook `useUser()` client pour accéder au profil dans les composants enfants

## Capabilities

### New Capabilities
- `protected-app-layout`: Layout racine pour toutes les routes authentifiées — vérifie la session serveur, injecte le profil utilisateur via context, affiche la sidebar/header Brikii partagés

### Modified Capabilities
- Aucune

## Impact

- `app/(app)/layout.tsx` — nouveau fichier (Server Component)
- `app/(app)/dashboard/` — déplacement depuis `app/dashboard/`
- `app/dashboard/` — supprimé
- `components/shared/PageLayout.tsx` — adapté pour recevoir le profil depuis le layout parent
- `providers/user-provider.tsx` — nouveau context React pour le profil utilisateur côté client
- Aucune modification de schéma BDD, aucune nouvelle dépendance npm
