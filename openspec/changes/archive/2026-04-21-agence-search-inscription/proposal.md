## Why

Lors de l'inscription, les agents et mandataires n'ont aucun moyen de rattacher leur compte à leur agence ou réseau. Le champ `agence_mandant` (texte libre) est insuffisant : il ne permet ni la vérification de légitimité, ni la collaboration future entre membres d'un même réseau. La table `agences` existe mais n'est pas encore exploitée à l'inscription.

## What Changes

- **Migration SQL** : enrichissement de la table `agences` (statut, source, siret, siret_verifie, demande_par, sirene_data) + création de `agences_demandes`
- **Nouveau** : `lib/sirene/lookup.ts` — intégration API SIRENE INSEE pour recherche et vérification d'entreprises immobilières
- **Nouveau** : 3 API Routes — `/api/agences/search`, `/api/agences/verify-siret`, `/api/agences/request`
- **Nouveau** : `components/shared/AgenceSearchInput.tsx` — autocomplete avec modal de création de demande
- **Nouveau** : `supabase/seed.sql` — données initiales des grands réseaux (IAD, Safti, Century 21, etc.)
- **Mise à jour** : `.env.example` — ajout `SIRENE_API_TOKEN`

## Capabilities

### New Capabilities

- `agence-search` : Recherche d'agences combinant la base locale Brikii et l'API SIRENE INSEE, avec rate limiting, filtrage NAF immobilier et fallback gracieux.
- `agence-request` : Demande de création d'agence non référencée : vérification SIRET, formulaire de demande, notification admin email.
- `agence-search-ui` : Composant UI autocomplete de sélection d'agence avec logo, suggestion SIRENE et modal de demande.

### Modified Capabilities

<!-- Aucune spec existante à modifier -->

## Impact

- **BDD** : ALTER TABLE `agences` + CREATE TABLE `agences_demandes` (nouvelle migration)
- **Nouvelles dépendances** : Upstash Redis (rate limiting, déjà configuré), Resend (email admin, déjà configuré)
- **Nouvelle variable d'env** : `SIRENE_API_TOKEN` (api.insee.fr, gratuit)
- **Fichiers nouveaux** : `lib/sirene/lookup.ts`, 3 route handlers, 1 composant, `supabase/seed.sql`
- **Fichiers modifiés** : `.env.example`, migration SQL existante inchangée (nouvelle migration séparée)
