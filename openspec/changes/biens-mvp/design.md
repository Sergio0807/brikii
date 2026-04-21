## Context

La table `biens` et ses sous-tables sont en place. Il n'existe aucune interface ni API biens. Le design system Brikii et le client Supabase sont opérationnels. Un workflow n8n externe est en place pour le scraping d'annonces.

Le scraping d'une annonce avec 30 à 50 photos (téléchargement + upload Cloudflare) peut prendre plusieurs dizaines de secondes. Un appel synchrone est incompatible avec ce volume. Le flux est donc **asynchrone** : l'app déclenche n8n et retourne immédiatement ; n8n rappelle l'app via webhook quand c'est prêt.

Il n'y a **pas d'étape de revue obligatoire** avant insertion — le bien est créé automatiquement à réception du payload n8n. Les biens importés sont marqués `a_verifier = true` pour signaler qu'une relecture est souhaitable, sans la bloquer.

---

## Flux complet : app → n8n → webhook → Supabase

```
1. Agent colle une URL → clique "Importer"

2. App  →  POST /api/biens/import
   - crée bien_imports { user_id, source_url, status: 'pending' }
   - appelle n8n : POST N8N_WEBHOOK_URL { url, import_id, user_id }
   - retourne immédiatement { import_id }  HTTP 202

3. UI affiche le suivi d'import (polling GET /api/biens/import/[id] toutes les 5s)
   États : pending → running → completed | error

4. n8n (asynchrone) :
   - scrappe l'annonce
   - télécharge les photos
   - upload photos → Cloudflare Images
   - construit le JSON normalisé
   - appelle POST /api/webhooks/n8n/biens  (HMAC signé)
     { import_id, source, bien, details_type, photos }

5. Webhook receiver :
   a. Vérifie HMAC-SHA256 (header x-brikii-signature)  →  401 si invalide
   b. Valide le payload avec Zod  →  422 si invalide
   c. Met à jour bien_imports.status = 'running'
   d. Insère dans `biens`  (a_verifier = true, source_url, source_portail)
   e. Insère dans sous-table type si couverte (maison | appartement)
   f. Insère dans `bien_photos` pour chaque photo
   g. Met à jour bien_imports { status: 'completed', bien_id }
   →  retourne HTTP 200

6. En cas d'erreur mapping / validation :
   - Met à jour bien_imports { status: 'error', error_message }
   →  retourne HTTP 422

7. UI détecte status = 'completed' → redirige vers /biens
   UI détecte status = 'error' → affiche erreur + lien "Saisir manuellement"
```

---

## Contrat JSON n8n → application (payload webhook)

```json
{
  "import_id": "uuid-de-l-import",
  "source": {
    "url": "https://seloger.com/annonces/123456",
    "portail": "SeLoger"
  },
  "bien": {
    "type": "maison",
    "adresse": "12 rue des Lilas",
    "ville": "Albi",
    "code_postal": "81000",
    "prix": 479000,
    "surface_hab": 206,
    "descriptif": "Belle propriété..."
  },
  "details_type": {
    "surface_terrain": 1700,
    "nb_pieces": 8,
    "nb_chambres": 7,
    "nb_sdb": 1,
    "etat_general": "bon",
    "travaux": false,
    "taxe_fonciere": 2400,
    "dpe_lettre": "C",
    "dpe_valeur": 145,
    "garage": true,
    "piscine": false
  },
  "photos": [
    { "cloudflare_image_id": "abc123xyz", "url": "https://imagedelivery.net/xxx/abc123xyz/public", "ordre": 1 },
    { "cloudflare_image_id": "def456uvw", "url": "https://imagedelivery.net/xxx/def456uvw/public", "ordre": 2 }
  ]
}
```

**Règles du contrat :**
- `import_id` obligatoire — permet de retrouver l'enregistrement `bien_imports`
- `source.url`, `bien.type`, `bien.adresse`, `bien.ville`, `bien.code_postal`, `bien.prix` obligatoires
- `details_type` optionnel — contenu dépend du type ; champs inconnus ignorés silencieusement
- `photos` optionnel — peut être absent ou vide
- n8n est responsable de l'upload Cloudflare ; l'app reçoit uniquement des `cloudflare_image_id` déjà valides

---

## Structure de la table `bien_imports`

```sql
create table public.bien_imports (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete restrict,
  source_url      text not null,
  status          text not null default 'pending'
                  constraint bien_imports_status_check
                  check (status in ('pending','scraping','mapping','completed','error')),
  bien_id         uuid references public.biens(id) on delete set null,
  error_message   text,
  n8n_payload     jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
```

**Cycle de vie du `status` — positionné exclusivement par l'application :**

| Status | Positionné par | Moment |
|--------|---------------|--------|
| `pending` | App | À la création de l'import |
| `scraping` | App | Immédiatement après appel n8n réussi |
| `mapping` | App | Dès réception du webhook n8n |
| `completed` | App | Après insertion réussie en base |
| `error` | App | À tout moment d'échec (n8n injoignable, Zod, insertion) |

- `n8n_payload` : payload brut reçu de n8n, conservé pour débogage
- `bien_id` : renseigné quand `status = completed`
- `error_message` : renseigné quand `status = error`, message lisible pour l'UI
- RLS : un agent ne voit que ses propres imports (`user_id = auth.uid()`)

---

## Goals / Non-Goals

**Goals:**
- Liste des biens avec badge "À vérifier" sur les biens importés
- Création manuelle (champs minimum MVP)
- Import async : déclenchement n8n, suivi polling, création auto sans validation intermédiaire
- Webhook HMAC sécurisé pour la réception des données n8n
- Insertion dans `biens` + sous-table (maison/appartement) + `bien_photos`
- Migrations : `bien_imports`, `bien_photos`, colonne `biens.a_verifier`

**Non-Goals:**
- Sous-tables autres que maison et appartement (terrain, immeuble, commerce : bien inséré sans détails)
- Upload photos manuelles
- Géocodage automatique
- Étape de revue/validation avant insertion
- Pagination, filtres, carte Mapbox
- Édition ou suppression de bien
- Partage pool

---

## Decisions

**1. Flux asynchrone avec table `bien_imports`**

Le scraping + upload photos peut dépasser 60s pour un bien avec 30-50 photos. La limite Vercel (30s) rend le flux synchrone inutilisable. La table `bien_imports` assure le suivi de bout en bout et permet à l'UI de poller sans bloquer.

Alternative rejetée — synchrone : incompatible avec le volume de photos, risque de timeout systématique.

**2. Polling UI toutes les 5s — pas de WebSocket**

Simple à implémenter, sans dépendance supplémentaire. Pour un MVP, le délai de 5s est imperceptible. Si l'import dure 2 minutes, c'est 24 requêtes légères. WebSocket ou SSE pourront être introduits si le polling devient un problème à l'échelle.

**3. Auto-insert sans revue — flag `a_verifier`**

Zéro friction à l'import. Le bien est créé immédiatement avec `a_verifier = true`. L'agent voit le badge dans la liste et peut corriger. La colonne `a_verifier` est un booléen simple, réinitialisable par l'agent (feature future). Pas de nouveau statut dans l'enum `statut` — le bien reste `brouillon`.

Alternative écartée — revue obligatoire : introduit une friction inutile au MVP, peut être ajoutée plus tard.

**4. Authentification webhook : HMAC-SHA256 — implémentation obligatoire**

N8n signe chaque requête callback avec `N8N_WEBHOOK_SECRET` (variable d'environnement, jamais dans le code). L'app DOIT vérifier la signature avant tout traitement du payload.

Protocole de vérification :
- Header attendu : `x-brikii-signature: sha256=<hex_digest>`
- Calcul : `HMAC-SHA256(rawBody, N8N_WEBHOOK_SECRET)` — sur le body **brut** (avant parsing JSON)
- Comparaison : **à temps constant** (`timingSafeEqual`) pour éviter les timing attacks
- Comportement : rejet HTTP 401 immédiat si header absent, format invalide, ou signature incorrecte
- Aucune logique métier n'est exécutée avant validation de la signature

Pattern identique aux webhooks Stripe. `N8N_WEBHOOK_SECRET` doit figurer dans `.env.example` avec une valeur vide et une note explicite.

**5. Insertion sous-table limitée à maison + appartement**

Ces deux types couvrent la majorité des imports Pass'Adresses. Les autres types seront complétés dans une itération suivante. Pour les types non couverts, seule `biens` est insérée — `details_type` est conservé dans `bien_imports.n8n_payload` pour usage futur.

**6. `a_verifier` — colonne boolean, pas nouveau statut**

Modifier l'enum `statut` (migration ALTER TYPE) est une opération plus lourde. Un booléen nullable (`a_verifier boolean default false`) est plus simple, non destructif, et suffisant pour le MVP.

**7. `reference` bien auto-générée**

Format `BIEN-YYYYMMDD-XXXXXX`. Généré côté app lors de l'insertion, aussi bien en manuel qu'en import.

---

## Stratégie imports bloqués

Un import peut rester bloqué si n8n plante silencieusement, si le réseau est coupé, ou si n8n prend anormalement longtemps.

**Seuil MVP : 15 minutes** (couvre les cas de biens avec 30-50 photos).

**Détection côté UI** (pas de cron pour le MVP) :
- Si `status` est `pending` ou `scraping` et `created_at` > 15 min, l'UI affiche le message "L'import prend plus de temps que prévu ou a rencontré un problème."
- Deux actions proposées : **Relancer** (crée un nouvel import avec la même URL) et **Saisir manuellement** (bascule vers le formulaire manuel)
- L'import bloqué reste en base avec son status actuel — pas de suppression automatique au MVP

**Relancer** : l'agent clique → l'UI appelle `POST /api/biens/import` avec `source_url` de l'import précédent → nouvel `import_id` → le composant de suivi bascule vers ce nouvel import.

**Nettoyage futur** : une Edge Function Supabase ou un cron Vercel pourra passer automatiquement les imports `pending | scraping` de plus de 15 min à `error` avec `error_message = 'Import expiré'`.

---

## Risks / Trade-offs

- **Import sans revue** → Des données incorrectes peuvent être insérées. Mitigé par le flag `a_verifier`. Risque accepté explicitement pour le MVP.
- **n8n ne rappelle jamais** → Import bloqué en `scraping`. Mitigé par la détection UI à 15 min + bouton Relancer. Mitigation future : cron de nettoyage.
- **Sous-tables non couvertes** → `details_type` ignoré pour terrain/commerce. Acceptable : Pass'Adresses ne dépend pas de ces champs.
- **Polling consomme des requêtes Supabase** → Négligeable pour un MVP à faible volume.
