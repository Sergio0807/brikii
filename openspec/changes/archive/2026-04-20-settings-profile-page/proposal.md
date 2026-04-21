## Why

L'utilisateur peut se connecter mais son profil (prénom, nom, etc.) reste vide après l'inscription car le trigger SQL n'insère que l'email. Il n'existe pas encore de page permettant de renseigner ou modifier ces informations, ce qui rend la sidebar inutilisable et empêche toute personnalisation.

## What Changes

- Création de la page `/settings` (route existante mais sans contenu)
- Formulaire de modification du profil utilisateur (civilité, prénom, nom, téléphone, statut professionnel, SIREN, RSAC, agence mandante)
- Server Action Supabase pour la mise à jour de la table `profiles`
- Rafraîchissement du nom dans la sidebar après sauvegarde

## Capabilities

### New Capabilities

- `profile-edit`: Consultation et modification des informations personnelles stockées dans `profiles` via un formulaire server-side avec validation Zod et Server Action Supabase.

### Modified Capabilities

<!-- Aucune spec existante à modifier -->

## Impact

- **Nouveau** : `app/(app)/settings/page.tsx`, `app/(app)/settings/ProfileForm.tsx`, `app/actions/profile.ts`
- **Existant modifié** : aucun
- **Dépendances** : `@supabase/ssr` (déjà installé), `zod` (déjà installé)
