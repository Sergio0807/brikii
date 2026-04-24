## 1. Migrations base de données

- [x] 1.1 Créer migration `bien_photos` : table avec `id`, `bien_id FK CASCADE`, `cloudflare_image_id`, `url`, `ordre`, `created_at` ; index sur `bien_id` ; RLS via `biens.user_id = auth.uid()`
- [x] 1.2 Créer migration `bien_imports` : table avec `id`, `user_id FK`, `source_url`, `status` (enum `pending | scraping | mapping | completed | error`, default `pending`), `bien_id FK nullable`, `error_message`, `n8n_payload jsonb`, `created_at`, `updated_at` ; index sur `user_id` et `status` ; RLS (`user_id = auth.uid()`)
- [x] 1.3 Créer migration : ajout colonne `a_verifier boolean NOT NULL DEFAULT false` sur `biens`
- [x] 1.4 Appliquer les trois migrations sur Supabase DEV (via `migration repair --status applied` — tables créées manuellement avant)

## 2. API Route `/api/biens` (GET + POST — création manuelle)

- [x] 2.1 Créer `app/api/biens/route.ts` avec handler GET (liste biens de l'utilisateur, limit 50, tri created_at desc, inclure le champ `a_verifier`)
- [x] 2.2 Ajouter handler POST avec schéma Zod : `type`, `adresse`, `ville`, `code_postal`, `prix` obligatoires ; `surface_hab`, `descriptif` optionnels ; objet optionnel `details`
- [x] 2.3 Générer la référence automatique `BIEN-YYYYMMDD-XXXXXX` avant insertion
- [x] 2.4 Insérer dans `biens` avec `a_verifier = false` ; si type = `maison` ou `appartement` et `details` présent, insérer dans sous-table
- [x] 2.5 Retourner HTTP 401 si pas de session, HTTP 400 si validation échoue, HTTP 201 avec `{ id, reference }`
- [x] 2.6 Ajouter rate limiting sur POST (réutiliser `lib/rate-limit`)

## 3. API Route `/api/biens/import` (déclenchement async)

- [x] 3.1 Créer `app/api/biens/import/route.ts` handler POST
- [x] 3.2 Valider avec Zod que le body contient une `source_url` valide
- [x] 3.3 Vérifier la session (HTTP 401 si absent)
- [x] 3.4 Créer un enregistrement `bien_imports` avec `status = 'pending'`
- [x] 3.5 Appeler `N8N_WEBHOOK_URL` avec `{ url: source_url, import_id, user_id }` via fetch (fire-and-no-wait)
- [x] 3.6 Si appel n8n réussi : mettre `bien_imports.status = 'scraping'` et retourner HTTP 202 avec `{ import_id }`
- [x] 3.7 Si appel n8n échoue : mettre `bien_imports { status: 'error', error_message }` et retourner HTTP 502

## 4. API Route `/api/biens/import/[id]` (polling)

- [x] 4.1 Créer `app/api/biens/import/[id]/route.ts` handler GET
- [x] 4.2 Vérifier la session et que `bien_imports.user_id = auth.uid()` (HTTP 404 sinon)
- [x] 4.3 Retourner `{ status, bien_id, error_message }` HTTP 200

## 5. Webhook `/api/webhooks/n8n/biens` (réception payload n8n)

- [x] 5.1 Créer `app/api/webhooks/n8n/biens/route.ts` handler POST
- [x] 5.2 Lire le body brut (avant parsing JSON) pour la vérification HMAC
- [x] 5.3 Vérifier la présence du header `x-brikii-signature` (format `sha256=<hex>`) → HTTP 401 si absent ou mal formé
- [x] 5.4 Calculer `HMAC-SHA256(rawBody, N8N_WEBHOOK_SECRET)` et comparer avec `crypto.timingSafeEqual` → HTTP 401 si signature incorrecte ; HTTP 500 si `N8N_WEBHOOK_SECRET` non configuré
- [x] 5.5 Valider le payload JSON avec Zod (schéma contrat : `import_id`, `source`, `bien`, `details_type` optionnel, `photos` optionnel)
- [x] 5.6 Vérifier que `import_id` existe en base et appartient à un utilisateur valide (HTTP 404 sinon) ; mettre `bien_imports.status = 'mapping'`
- [x] 5.7 Générer la référence bien, insérer dans `biens` avec `a_verifier = true`, `source_url`, `source_portail`
- [x] 5.8 Si type = `maison` ou `appartement` et `details_type` présent : insérer dans sous-table avec les champs mappés
- [x] 5.9 Si `photos` non vide : insérer les lignes dans `bien_photos` (cloudflare_image_id, url, ordre, bien_id)
- [x] 5.10 Stocker le payload brut dans `bien_imports.n8n_payload`
- [x] 5.11 Mettre à jour `bien_imports { status: 'completed', bien_id }` ; retourner HTTP 200
- [x] 5.12 Sur toute erreur (Zod, insertion) : mettre `bien_imports { status: 'error', error_message lisible }` ; retourner HTTP 422 ou 500

## 6. Page liste `/biens`

- [x] 6.1 Créer `app/(app)/biens/page.tsx` (Server Component) qui récupère les biens via GET `/api/biens`
- [x] 6.2 Afficher pour chaque bien : type, ville + CP, prix formaté, badge statut ; badge "À vérifier" si `a_verifier = true`
- [x] 6.3 Afficher un état vide avec bouton "Ajouter un bien" si aucun bien
- [x] 6.4 Bouton "Ajouter un bien" en haut de page → `/biens/nouveau`

## 7. Page formulaire `/biens/nouveau`

- [x] 7.1 Créer `app/(app)/biens/nouveau/page.tsx` (wrapper Server Component)
- [x] 7.2 Créer `app/(app)/biens/nouveau/BienForm.tsx` (Client Component) avec deux onglets : "Saisie manuelle" / "Importer une annonce"
- [x] 7.3 Onglet Manuel : champs type (select enum), adresse, ville, code_postal, prix, surface_hab (optionnel), descriptif (optionnel) → `POST /api/biens` → redirect `/biens`
- [x] 7.4 Onglet Import : champ URL + bouton "Importer" → `POST /api/biens/import` → affiche le composant de suivi
- [x] 7.5 Créer composant `ImportStatus.tsx` (Client Component) : polling `GET /api/biens/import/[id]` toutes les 5s, affiche un message lisible par status (`pending` → "En attente…", `scraping` → "Analyse de l'annonce…", `mapping` → "Enregistrement…"), arrête le polling à `completed` ou `error`
- [x] 7.6 À `completed` : arrêter le polling et rediriger automatiquement vers `/biens`
- [x] 7.7 À `error` : afficher `error_message` + deux boutons : "Relancer l'import" (POST /api/biens/import même URL) et "Saisir manuellement" (bascule onglet Manuel)
- [x] 7.8 Détecter import bloqué : si `status` est `pending` ou `scraping` et `Date.now() - created_at > 15 min`, arrêter le polling et afficher "L'import prend plus de temps que prévu." + mêmes boutons que l'état error
- [x] 7.9 Stocker `source_url` et `created_at` dans le state du composant pour la détection de blocage et le relancement

## 8. Navigation et variables d'environnement

- [x] 8.1 Ajouter lien "Biens" dans la sidebar `app/(app)/layout.tsx`
- [x] 8.2 Ajouter `/biens` dans `PROTECTED_PATHS` du proxy (`lib/supabase/proxy.ts`)
- [x] 8.3 Ajouter `N8N_WEBHOOK_URL` et `N8N_WEBHOOK_SECRET` dans `.env.example` avec commentaires explicites (N8N_WEBHOOK_SECRET = secret partagé pour signature HMAC des callbacks)

## 9. Fiche bien Direction A (hors scope initial)

- [x] 9.1 Créer `app/(app)/biens/[id]/page.tsx` — header enrichi avec back, subtitle badges, actions
- [x] 9.2 Créer `app/(app)/biens/[id]/BienDetail.tsx` — layout 2 colonnes lg:grid-cols-[3fr_2fr]
- [x] 9.3 Créer `app/api/biens/[id]/route.ts` — GET bien + sous-table + photos, PATCH
- [x] 9.4 Créer `components/shared/AdresseAutocomplete.tsx` — autocomplete api-adresse.data.gouv.fr
- [x] 9.5 Étendre `AppHeader` — props back, subtitle ReactNode, minHeight

## 10. Infrastructure et déploiement (hors scope initial)

- [x] 10.1 Créer `lib/supabase/admin.ts` — createAdminClient avec SUPABASE_SERVICE_ROLE_KEY pour bypass RLS dans le webhook
- [x] 10.2 Déploiement Vercel — intégration GitHub, variables d'env, build fixes Resend lazy init + Suspense useSearchParams
- [x] 10.3 Fix auth flow — callback transmet error_code, login affiche messages erreur et confirmation
- [x] 10.4 Root page — redirige vers /dashboard si connecté, /login sinon
- [x] 10.5 Seed agences — 14 réseaux insérés en prod via Supabase SQL Editor
