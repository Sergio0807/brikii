## ADDED Requirements

### Requirement: Session verification at layout level
Le layout `app/(app)/layout.tsx` SHALL vérifier la session Supabase côté serveur. Si aucune session valide n'est présente, il MUST rediriger vers `/login?redirect=<pathname>` avant de rendre le moindre composant enfant.

#### Scenario: Utilisateur non authentifié accède à une route protégée
- **WHEN** un utilisateur non authentifié navigue vers `/dashboard`, `/biens`, `/mandats`, `/contacts`, `/pass-adresses`, `/notifications` ou `/settings`
- **THEN** le système le redirige vers `/login?redirect=<chemin demandé>` sans rendre le contenu de la page

#### Scenario: Utilisateur authentifié accède à une route protégée
- **WHEN** un utilisateur avec une session Supabase valide navigue vers une route du groupe `(app)`
- **THEN** le layout rend la sidebar, le header et le contenu de la page sans redirection

### Requirement: Profil utilisateur disponible via context
Le layout SHALL charger le profil `profiles` (prenom, nom, statut_professionnel, avatar_url) depuis Supabase et le MUST passer à un `UserProvider` React afin que tous les composants enfants puissent y accéder via `useUser()` sans appel réseau supplémentaire.

#### Scenario: Composant client accède au profil
- **WHEN** un composant client (ex: sidebar avatar, LogoutButton) appelle `useUser()`
- **THEN** il reçoit `{ user, profile }` avec les données chargées par le layout serveur

#### Scenario: Profil introuvable (nouveau compte sans profil)
- **WHEN** `profiles` ne retourne aucune ligne pour l'utilisateur authentifié
- **THEN** `useUser()` retourne `{ user, profile: null }` sans erreur — les composants doivent gérer ce cas gracieusement

### Requirement: PageLayout partagé dans le groupe (app)
Le layout du groupe `(app)` SHALL intégrer `PageLayout` (sidebar + zone contenu) de sorte que chaque page enfant n'a pas à l'instancier individuellement. Les pages MUST pouvoir passer `title`, `subtitle` et `actions` via les props de leur propre layout ou via un composant `AppHeader`.

#### Scenario: Page dashboard affiche son titre dans le header
- **WHEN** la page `dashboard` est rendue
- **THEN** le header affiche "Tableau de bord" sans que la page instancie `PageLayout` elle-même

### Requirement: URLs publiques inchangées
Le déplacement des pages vers `app/(app)/` SHALL être transparent pour les URLs. Les routes `/dashboard`, `/biens`, etc. MUST rester identiques après refactoring.

#### Scenario: URL /dashboard reste accessible
- **WHEN** l'utilisateur navigue vers `http://localhost:3000/dashboard`
- **THEN** la page dashboard se charge normalement (le groupe `(app)` n'apparaît pas dans l'URL)
