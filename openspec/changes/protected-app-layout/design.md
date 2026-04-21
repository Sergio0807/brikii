## Context

Actuellement, `app/dashboard/` est une page protégée isolée qui vérifie la session Supabase de manière autonome via `createClient()` serveur + `redirect('/login')`. Les futures pages (biens, mandats, contacts, pass-adresses) devraient répliquer ce même pattern de protection. Sans groupe App Router commun, chaque page doit :
- instancier son propre client Supabase serveur
- vérifier la session individuellement
- instancier `PageLayout` avec sidebar/header

## Goals / Non-Goals

**Goals:**
- Centraliser la vérification de session dans un seul Server Component layout
- Fournir le profil utilisateur via React Context aux composants enfants (client)
- Déplacer `app/dashboard/` sous `app/(app)/dashboard/` sans changer l'URL publique
- Rendre `PageLayout` inerte vis-à-vis de la session (il reçoit les données, ne les charge pas)

**Non-Goals:**
- Gestion des rôles ou permissions granulaires (prévu en V2)
- Chargement de données métier dans le layout (chaque page reste responsable de ses données)
- Modification du système d'authentification ou du proxy

## Decisions

### 1. Groupe `(app)` comme frontière d'authentification
**Décision** : Un seul `app/(app)/layout.tsx` Server Component vérifie `supabase.auth.getUser()` et redirige.
**Pourquoi** : Next.js App Router exécute les layouts en cascade — un seul point de contrôle suffit pour toutes les routes enfants. Alternative écartée : middleware/proxy (déjà en place pour la redirection HTTP, mais le layout serveur est plus approprié pour injecter des données dans le contexte React).

### 2. UserProvider pour le profil côté client
**Décision** : Le layout serveur charge le profil `profiles` depuis Supabase, le passe à un `UserProvider` ('use client') qui expose un `useUser()` hook.
**Pourquoi** : Les composants client (LogoutButton, sidebar avatar, etc.) ont besoin du profil sans re-fetcher depuis le client. Passer le profil comme prop serialisée du Server Component vers le Provider évite un appel Supabase supplémentaire côté navigateur.

### 3. PageLayout reste un composant pur
**Décision** : `PageLayout` ne charge aucune donnée — il reçoit `user` en prop optionnelle pour afficher le nom/avatar dans la sidebar.
**Pourquoi** : Séparation claire data-fetching (layout serveur) / présentation (PageLayout). Plus facile à tester et réutiliser hors contexte auth (ex: pages publiques avec layout simplifié).

## Risks / Trade-offs

- **Déplacement de dashboard/** → les liens hardcodés vers `/dashboard` restent valides (l'URL ne change pas, seule l'arborescence fichiers change). Risque faible.
- **Double vérification session** : le proxy (`proxy.ts`) et le layout vérifient tous deux la session. Légère redondance, mais le proxy opère au niveau HTTP (headers/cookies) et le layout au niveau React — les deux sont nécessaires pour éviter les flash de contenu non authentifié.
- **Sérialisation du profil** : le profil passé du Server Component au Client Component doit être sérialisable (pas de `Date` objects, pas de `undefined`). À respecter dans `app/(app)/layout.tsx`.
