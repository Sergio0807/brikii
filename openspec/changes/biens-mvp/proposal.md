## Why

La table `biens` et ses tables détails sont en place en base (migrations + RLS), mais aucune interface n'existe pour créer ou consulter des biens. Or `pass_adresses` exige un `bien_id` NOT NULL — sans biens, il est impossible de créer une demande Pass'Adresse. C'est le prérequis absolu du MVP.

La création de bien doit dès le départ supporter deux modes : saisie manuelle et import depuis une URL d'annonce via n8n. L'import est **asynchrone** — n8n scrape l'annonce et traite les photos (jusqu'à 30-50 par bien), l'application crée le bien automatiquement à réception des données, sans étape de validation obligatoire. Les biens importés sont marqués `a_verifier = true` pour signaler qu'une relecture est souhaitable.

## What Changes

- Nouvelle page liste des biens (`/biens`) avec badge visuel sur les biens à vérifier
- Nouvelle page formulaire `/biens/nouveau` : deux modes d'entrée distincts (manuel / import URL)
- `POST /api/biens/import` : déclenche l'import async (crée `bien_imports`, appelle n8n, retourne `import_id`)
- `GET /api/biens/import/[id]` : état d'avancement d'un import (polling UI)
- `POST /api/webhooks/n8n/biens` : webhook HMAC signé, reçoit le payload n8n, mappe et insère en base
- `GET /api/biens` + `POST /api/biens` : liste et création manuelle
- Migration `bien_imports` : table de suivi des imports asynchrones
- Migration `bien_photos` : table photos Cloudflare Images
- Migration : ajout colonne `a_verifier boolean` sur `biens`

## Capabilities

### New Capabilities

- `bien-list` : afficher la liste des biens de l'agent connecté (max 50), avec badge "À vérifier" sur les biens importés
- `bien-create` : créer un bien manuellement avec les champs minimum MVP
- `bien-import-async` : déclencher l'import asynchrone d'un bien depuis une URL d'annonce ; suivre l'état via polling ; le bien est créé automatiquement sans validation intermédiaire
- `bien-import-tracking` : table `bien_imports` pour suivre le cycle de vie des imports (pending → running → completed/error) ; UI avec états visuels
- `bien-photos` : persister les photos issues de Cloudflare Images dans `bien_photos` (cloudflare_image_id, url, ordre, bien_id)

### Modified Capabilities

_(aucune — pas de spec existante à modifier)_

## Impact

- Nouveaux fichiers app : `app/(app)/biens/page.tsx`, `app/(app)/biens/nouveau/page.tsx`, `app/api/biens/route.ts`, `app/api/biens/import/route.ts`, `app/api/biens/import/[id]/route.ts`, `app/api/webhooks/n8n/biens/route.ts`
- Nouvelles migrations : `bien_imports`, `bien_photos`, colonne `biens.a_verifier`
- Variables d'environnement : `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`
- Aucun impact sur l'existant (auth, settings, agences, pass_adresses)
- Débloque : mandats-mvp, puis pass-adresses
