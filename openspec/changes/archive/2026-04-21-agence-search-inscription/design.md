## Context

La table `agences` existe avec RLS. La table `agence_membres` lie un `user_id` à une `agence_id`. L'objectif est de permettre à un agent de trouver son agence/réseau à l'inscription et, si elle n'existe pas, de créer une demande. L'API SIRENE INSEE (api.insee.fr) fournit les données légales des entreprises françaises gratuitement via token Bearer. Upstash Redis et Resend sont déjà configurés dans le projet.

## Goals / Non-Goals

**Goals:**
- Recherche hybride : base locale Brikii en priorité, SIRENE en fallback si <3 résultats locaux
- Vérification SIRET : validation code NAF immobilier (6820A, 6820B, 6831Z, 6832A, 6832B)
- Demande de création : formulaire → ligne `agences_demandes` → email admin
- Seed des grands réseaux pour que la majorité des agents trouvent leur réseau dès le départ
- Rate limiting 20 req/min/IP sur `/api/agences/search`
- Composant autocomplete réutilisable (inscription + settings profil)

**Non-Goals:**
- Validation humaine des demandes (workflow admin — V2)
- Auto-rattachement à une agence après approbation (V2)
- Scraping automatique SIRENE pour pré-remplir la base (V2)

## Decisions

**API SIRENE via fetch natif** — L'API SIRENE retourne du JSON standard. Pas de SDK tiers nécessaire. Le token Bearer est passé en header `Authorization`. On cible l'endpoint `/entreprises` avec filtre `activitePrincipaleUniteLegale` sur les codes NAF.

**Recherche hybride locale + SIRENE** — La base locale (seed + demandes approuvées) est interrogée en premier via Supabase full-text search (`to_tsvector`). Si moins de 3 résultats, on complète avec SIRENE. Cela limite les appels à l'API externe et favorise les agences déjà connues de Brikii.

**Rate limiting Upstash Redis** — Sliding window 20 req/min/IP sur `/api/agences/search`. Même pattern que le reste du projet. Les endpoints `verify-siret` et `request` ont un rate limit plus strict (5 req/min/IP) car ce sont des opérations coûteuses.

**Table `agences_demandes` séparée** — Les demandes de création ne vont pas directement dans `agences` pour ne pas polluer la base avec des données non vérifiées. Un admin approuve manuellement (V2) et crée la ligne `agences` correspondante.

**Seed en SQL pur** — `supabase/seed.sql` avec INSERT des grands réseaux. `owner_id` pointe vers un UUID système fixe (à définir) ou est nullable via migration. On choisit de rendre `owner_id` nullable pour les agences "système" Brikii (`source = 'brikii'`).

**`owner_id` nullable pour agences Brikii** — La migration ALTER ajoute `source` et rend `owner_id` nullable avec une contrainte CHECK : `owner_id IS NOT NULL OR source = 'brikii'`. Les agences créées par les users gardent `owner_id NOT NULL`.

## Risks / Trade-offs

- **SIRENE indisponible** → Fallback : on retourne seulement les résultats locaux, sans erreur côté client. Le composant affiche "Recherche étendue indisponible".
- **Token SIRENE expiré/absent** → Même fallback. La recherche locale reste fonctionnelle.
- **`owner_id` nullable** : casse la contrainte NOT NULL actuelle → la migration doit d'abord insérer les agences seed AVANT de relâcher la contrainte, ou utiliser un UUID admin fixe. On choisit l'UUID admin fixe (plus propre avec RLS).
- **RLS `agences_select_own`** utilise `owner_id = auth.uid()` → les agences Brikii (owner_id = UUID admin) ne seraient pas visibles par les users. Il faut ajouter une policy `agences_select_public` pour `source = 'brikii'` et `statut = 'active'`.
