## 1. Base de données

- [x] 1.1 Créer `supabase/migrations/20260420230000_agences_enrichissement.sql` : ALTER TABLE agences (rendre owner_id nullable avec CHECK source='brikii', ajouter statut, source, siret VARCHAR(14), siret_verifie BOOLEAN, demande_par UUID FK profiles, sirene_data JSONB) + policy `agences_select_public` pour source='brikii' et statut='active'
- [x] 1.2 Créer `supabase/migrations/20260420230001_agences_demandes.sql` : CREATE TABLE agences_demandes (id, siret, nom, ville, contact_email, contact_nom, statut, demande_par FK profiles, traite_par FK profiles nullable, notes_admin, metadata, timestamps) + RLS (select/insert own)
- [x] 1.3 Créer `supabase/seed.sql` : INSERT des 13 réseaux (IAD, Safti, Propriétés Privées, Capifrance, Optimhome, BSK, EffiCity, Megagence, Century 21, ERA, Guy Hoquet, Laforêt, Orpi) avec source='brikii', statut='active', siret réel

## 2. Intégration SIRENE

- [x] 2.1 Créer `lib/sirene/lookup.ts` : fonction `lookupSiret(siret: string)` — GET `https://api.insee.fr/entreprises/sirene/V3.11/siret/{siret}` avec Bearer token, retourne données normalisées ou null
- [x] 2.2 Ajouter dans `lib/sirene/lookup.ts` : fonction `searchAgences(query: string)` — GET avec filtre `q=denominationUniteLegale:*{query}*` ET `activitePrincipaleUniteLegale:(6820A OR 6820B OR 6831Z OR 6832A OR 6832B)`, retourne tableau normalisé
- [x] 2.3 Ajouter `SIRENE_API_TOKEN=` dans `.env.example` avec commentaire `# api.insee.fr (compte gratuit requis)`

## 3. API Routes

- [x] 3.1 Créer `app/api/agences/search/route.ts` : GET ?q= — validation query (min 2 chars), recherche Supabase full-text sur agences, si <3 résultats complète avec `searchAgences()`, rate limit 20/min/IP via Upstash Redis, retourne JSON unifié max 10 résultats
- [x] 3.2 Créer `app/api/agences/verify-siret/route.ts` : POST {siret} — validation format SIRET (14 chiffres), appel `lookupSiret()`, vérification code NAF immobilier, rate limit 5/min/IP, retourne `{ valid, data? }`
- [x] 3.3 Créer `app/api/agences/request/route.ts` : POST {siret, nom, ville, contact_email, contact_nom} — validation Zod, vérif doublon (SIRET + statut pending), INSERT agences_demandes, email admin via Resend, rate limit 5/min/IP

## 4. Composant UI

- [x] 4.1 Créer `components/shared/AgenceSearchInput.tsx` : Client Component avec input texte, debounce 300ms, fetch vers `/api/agences/search`, liste déroulante résultats (nom + ville + logo), props `onSelect(agence)` et `defaultValue`
- [x] 4.2 Ajouter dans `AgenceSearchInput.tsx` : état "aucun résultat" avec bouton "Mon agence n'est pas dans la liste"
- [x] 4.3 Ajouter dans `AgenceSearchInput.tsx` : modal de demande avec champ SIRET (vérif live via `/api/agences/verify-siret`), pré-remplissage nom/ville depuis SIRENE, soumission vers `/api/agences/request`, message de confirmation
