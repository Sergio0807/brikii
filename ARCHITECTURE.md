# ARCHITECTURE.md — Brikii
> Document de référence technique — Version 1.0 — Avril 2026
> À maintenir à jour au fil du développement

---

## Table des matières

1. [Stack technique](#1-stack-technique)
2. [Architecture des environnements](#2-architecture-des-environnements)
3. [Structure du projet](#3-structure-du-projet)
4. [Base de données](#4-base-de-données)
5. [Authentification](#5-authentification)
6. [Workflow Git](#6-workflow-git)
7. [Déploiement](#7-déploiement)
8. [Variables d'environnement](#8-variables-denvironnement)
9. [Services tiers](#9-services-tiers)
10. [Sécurité](#10-sécurité)
11. [Performance et scalabilité](#11-performance-et-scalabilité)
12. [Portabilité future](#12-portabilité-future)
13. [Conventions de nommage](#13-conventions-de-nommage)
14. [Checklist jour 1](#14-checklist-jour-1)

---

## 1. Stack technique

### Décisions retenues

| Couche | Technologie | Version | Justification |
|--------|-------------|---------|---------------|
| Framework | Next.js | 14 (App Router) | SSR natif, API Routes intégrées, déploiement Vercel optimisé |
| UI | shadcn/ui + Tailwind CSS | Latest | Composants accessibles, code propriétaire, design system cohérent |
| Base de données | PostgreSQL via Supabase | PostgreSQL 15 | Données relationnelles complexes (38 tables), PostGIS, RLS natif |
| Auth | Supabase Auth | — | Intégré à PostgreSQL, JWT, OAuth prêt |
| Stockage fichiers | Supabase Storage | — | Intégré, URLs signées, RLS sur les buckets |
| Stockage photos | Cloudflare Images | — | CDN mondial, redimensionnement auto, coût optimisé |
| Emails | Resend + React Email | — | Conçu pour Next.js, templates React, 3k emails/mois gratuits |
| SMS | Twilio | — | Référence OTP, couverture mondiale |
| Paiements | Stripe | — | Standard SaaS, abonnements, webhooks robustes |
| Cartes | Mapbox | — | Meilleur rapport qualité/prix vs Google Maps |
| Rate limiting | Upstash Redis | — | Compatible Vercel Edge, serverless natif |
| Scraping annonces | n8n (existant) | — | Workflow existant validé, intégration webhook |
| Géocodage | API Adresse gouv.fr | — | Gratuit, fiable, français, codes postaux → GPS |
| Monitoring erreurs | Sentry | — | Standard, intégration Next.js native |
| Monitoring uptime | UptimeRobot | — | Alertes downtime, page statut public |
| Hébergement | Vercel | — | Déploiement preview automatique, optimisé Next.js |
| Génération BIA PDF | docxtemplater + LibreOffice | — | Template Word existant réutilisé, export PDF |

### Technologie écartée et pourquoi

| Technologie | Raison de l'exclusion |
|-------------|----------------------|
| Convex | Base documentaire — incompatible avec 38 tables relationnelles et requêtes PostGIS |
| Firebase | Pas de SQL, vendor lock-in Google, RLS moins puissant |
| PlanetScale | Pas de PostGIS, pas d'extensions PostgreSQL |
| n8n pour automatisations internes | Remplacé par Supabase Edge Functions + cron jobs |

---

## 2. Architecture des environnements

### Vue d'ensemble

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│      LOCAL      │     │       PREVIEW        │     │   PRODUCTION     │
│                 │     │                      │     │                  │
│  localhost:3000 │     │  [branch].vercel.app │     │   brikii.app     │
│                 │     │                      │     │                  │
│  Supabase DEV   │     │  Supabase STAGING    │     │  Supabase PROD   │
│  (projet dev)   │     │  (projet stg)        │     │  (projet prod)   │
└─────────────────┘     └─────────────────────┘     └──────────────────┘
       │                          │                          │
       └──────────────────────────┴──────────────────────────┘
                          Git (source de vérité)
```

### A. Environnement Local

**Objectif :** développement quotidien avec Claude Code

- URL : `http://localhost:3000`
- Base de données : Supabase projet DEV (région EU Frankfurt)
- Variables : `.env.local` (jamais commité)
- Hot reload, logs détaillés, erreurs verboses

**Prérequis locaux :**
```bash
node    >= 20.x
git     >= 2.x
npm     >= 10.x
# Optionnel mais recommandé :
supabase CLI  # gestion migrations en local
```

### B. Environnement Preview

**Objectif :** tester chaque feature avant merge dans main

- URL : `https://brikii-[branch-name]-[hash].vercel.app`
- Déclenchement : automatique à chaque push sur une branche `feature/*`
- Base de données : Supabase projet STAGING (partagé entre toutes les previews)
- Variables : groupe "Preview" dans Vercel Dashboard
- Durée de vie : tant que la branche existe

> ⚠️ Les données de staging sont des données de test — jamais de vraies données utilisateurs.

### C. Environnement Production

**Objectif :** l'application en production, stable et sécurisée

- URL : `https://brikii.app`
- Déclenchement : merge dans la branche `main` (manuel, après validation preview)
- Base de données : Supabase projet PROD (région EU Frankfurt, plan Pro)
- Variables : groupe "Production" dans Vercel Dashboard
- Zero downtime deployment via Vercel

### Projets Supabase

| Projet | Région | Plan | Usage |
|--------|--------|------|-------|
| `brikii-dev` | eu-west-1 (Frankfurt) | Free | Développement local |
| `brikii-stg` | eu-west-1 (Frankfurt) | Free | Preview / staging |
| `brikii-prod` | eu-west-1 (Frankfurt) | Pro ($25/mois) | Production |

> ✅ Région EU obligatoire pour la conformité RGPD (données hébergées en Europe).

---

## 3. Structure du projet

```
brikii/
├── .env.local                    # Variables locales (gitignored)
├── .env.example                  # Template des variables (commité)
├── .gitignore
├── next.config.ts                # Config Next.js + security headers
├── tailwind.config.ts
├── tsconfig.json
├── package.json
│
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Groupe routes auth (non protégées)
│   │   ├── login/
│   │   ├── register/
│   │   └── reset-password/
│   ├── (app)/                    # Groupe routes app (protégées)
│   │   ├── layout.tsx            # Layout principal avec sidebar
│   │   ├── dashboard/
│   │   ├── biens/
│   │   │   ├── page.tsx          # Liste des biens
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Fiche bien
│   │   ├── pools/
│   │   ├── pass-adresses/
│   │   ├── documents/
│   │   ├── contacts/
│   │   ├── mandats/
│   │   ├── compte/
│   │   └── admin/                # Back-office (role: admin_brikii)
│   ├── api/                      # API Routes Next.js
│   │   ├── auth/
│   │   ├── biens/
│   │   ├── pools/
│   │   ├── pass-adresses/
│   │   │   ├── create/
│   │   │   ├── questionnaire/    # Endpoint public (magic link)
│   │   │   └── bia/              # Génération PDF
│   │   ├── documents/
│   │   ├── webhooks/
│   │   │   ├── stripe/           # Webhooks Stripe
│   │   │   └── n8n/              # Retour scraping annonces
│   │   └── sms/                  # OTP Twilio
│   └── layout.tsx
│
├── components/                   # Composants React réutilisables
│   ├── ui/                       # shadcn/ui (auto-généré)
│   ├── layout/                   # Sidebar, header, navigation
│   ├── biens/                    # Composants spécifiques biens
│   ├── pools/                    # Composants spécifiques pools
│   ├── pass-adresses/            # Composants Pass'Adresses
│   └── shared/                   # Composants partagés
│
├── lib/                          # Utilitaires et configurations
│   ├── supabase/
│   │   ├── client.ts             # Client Supabase (browser)
│   │   ├── server.ts             # Client Supabase (server)
│   │   └── middleware.ts         # Auth middleware
│   ├── stripe/
│   │   ├── client.ts
│   │   └── webhooks.ts
│   ├── twilio/
│   │   └── otp.ts
│   ├── resend/
│   │   └── emails.ts
│   ├── cloudflare/
│   │   └── images.ts
│   ├── mapbox/
│   │   └── geocode.ts
│   ├── bia/
│   │   └── generator.ts          # Génération BIA PDF (docxtemplater)
│   ├── validations/              # Schémas Zod
│   │   ├── bien.ts
│   │   ├── pass-adresse.ts
│   │   └── user.ts
│   └── utils.ts
│
├── hooks/                        # React hooks custom
│   ├── useUser.ts
│   ├── useBiens.ts
│   └── useNotifications.ts
│
├── types/                        # Types TypeScript
│   ├── database.types.ts         # Auto-généré par Supabase CLI
│   ├── biens.ts
│   ├── pools.ts
│   └── pass-adresses.ts
│
├── emails/                       # Templates React Email
│   ├── welcome.tsx
│   ├── bia-questionnaire.tsx
│   ├── pool-invitation.tsx
│   └── ...
│
├── supabase/                     # Config Supabase
│   ├── config.toml               # Config CLI Supabase
│   ├── migrations/               # Migrations SQL versionnées
│   │   ├── 001_create_users.sql
│   │   ├── 002_create_agences.sql
│   │   ├── 003_create_biens.sql
│   │   └── ...
│   ├── seed.sql                  # Données de test (staging uniquement)
│   └── functions/                # Edge Functions Supabase
│       └── send-notification/
│
├── public/
│   ├── logo.svg
│   └── ...
│
└── docs/                         # Documentation projet
    ├── PRD.md
    ├── ARCHITECTURE.md           # Ce fichier
    └── CGU_Brikii_v2.docx
```

---

## 4. Base de données

### Principes fondamentaux

```
✅ PostgreSQL 15 via Supabase
✅ Row Level Security (RLS) activé sur TOUTES les tables
✅ Migrations versionnées dans supabase/migrations/
✅ Soft delete (deleted_at) sur toutes les tables principales
✅ Champ metadata JSONB sur toutes les tables (évolutivité)
✅ PostGIS pour les requêtes géographiques (pools, alertes)
✅ Jamais de modification directe en production
✅ Région EU Frankfurt (conformité RGPD)
```

### Conventions de nommage BDD

```sql
-- Tables : snake_case, pluriel
users, biens, pass_adresses, pool_membres

-- Colonnes : snake_case
user_id, created_at, deleted_at, bien_id

-- Clés primaires : toujours UUID
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Clés étrangères : [table_singulier]_id
user_id UUID REFERENCES users(id)

-- Timestamps obligatoires sur toutes les tables
created_at  TIMESTAMPTZ DEFAULT now()
updated_at  TIMESTAMPTZ DEFAULT now()
deleted_at  TIMESTAMPTZ  -- soft delete

-- Champ évolutivité obligatoire sur tables principales
metadata JSONB DEFAULT '{}'
```

### Workflow migrations

```bash
# 1. Créer une nouvelle migration
supabase migration new create_biens

# 2. Écrire le SQL dans supabase/migrations/[timestamp]_create_biens.sql

# 3. Appliquer en local
supabase db push

# 4. Vérifier en staging
supabase db push --db-url $SUPABASE_STG_URL

# 5. Appliquer en production (après validation)
supabase db push --db-url $SUPABASE_PROD_URL

# Règle absolue : jamais de modification directe via dashboard prod
```

### Génération des types TypeScript

```bash
# Synchroniser les types depuis Supabase
supabase gen types typescript --project-id [PROJECT_ID] > types/database.types.ts
```

### Extensions PostgreSQL activées

```sql
-- PostGIS : requêtes géographiques (rayons km, zones)
CREATE EXTENSION IF NOT EXISTS postgis;

-- UUID : génération d'identifiants
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cryptographie : hash OTP, tokens
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Schéma des 38 tables

Voir PRD.md section 17 pour le schéma complet.

**Résumé par domaine :**

```
UTILISATEURS (3)      users, agences, agence_membres
BIENS (9)             biens + 8 tables de détails par type
MANDATS (2)           mandats, mandat_proprietaires
CONTACTS (6)          contacts, contact_roles, contact_biens,
                      contact_interactions, contact_rappels,
                      contact_alertes_biens
PASS'ADRESSES (3)     pass_adresses, pass_templates, pass_relances
POOLS (5)             pools, pool_membres, pool_biens,
                      pool_acces_prives, pool_invitations
DOCUMENTS (3)         documents, documents_requis, documents_acces
ABONNEMENTS (7)       abonnements, abonnements_quotas, abonnements_usage,
                      factures, credits, credits_packs, parrainages
NOTIFICATIONS (2)     notifications, alertes_biens
STATISTIQUES (2)      stats_utilisateurs, stats_pools
SYSTÈME (4)           nouveautes, support_tickets,
                      support_messages, page_statut
```

---

## 5. Authentification

### Flux d'authentification

```
Inscription
  → Supabase Auth crée auth.users
  → Trigger SQL crée automatiquement users (table publique)
  → Email de confirmation envoyé via Resend
  → Période d'essai 30 jours démarrée

Connexion
  → Supabase Auth vérifie email + password
  → JWT retourné (expiration 24h)
  → Refresh token (30 jours)
  → Middleware Next.js vérifie le JWT sur chaque route protégée

Depuis pools.immo
  → Clic sur un bien → redirect vers brikii.app/login?redirect=/biens/[id]
  → Après auth → redirect automatique vers la fiche du bien
```

### Middleware de protection des routes

```typescript
// middleware.ts (racine du projet)
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  // Routes protégées : redirige vers /login si pas de session
  if (!session && req.nextUrl.pathname.startsWith('/(app)')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Route admin : vérifie le rôle
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const { data: user } = await supabase
      .from('users')
      .select('statut')
      .single()
    if (user?.statut !== 'admin_brikii') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/(app)/:path*', '/admin/:path*']
}
```

### Clients Supabase selon contexte

```typescript
// lib/supabase/client.ts — côté navigateur (composants client)
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
export const supabase = createClientComponentClient()

// lib/supabase/server.ts — côté serveur (Server Components, API Routes)
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
export const supabase = createServerComponentClient({ cookies })
```

---

## 6. Workflow Git

### Structure des branches

```
main                    ← Production (protégée, merge uniquement)
  └── feature/auth      ← Fonctionnalité en cours
  └── feature/biens     ← Fonctionnalité en cours
  └── feature/pools     ← Fonctionnalité en cours
  └── fix/bug-bia       ← Correction de bug
```

### Règles

```
✅ main est protégée — merge uniquement via Pull Request
✅ Aucun commit direct sur main
✅ 1 branche = 1 fonctionnalité ou 1 correction
✅ Nommage : feature/[nom], fix/[nom], chore/[nom]
✅ PR obligatoire avant merge dans main
✅ Validation manuelle de la preview avant merge
```

### Cycle de développement quotidien

```bash
# 1. Partir de main à jour
git checkout main && git pull

# 2. Créer une branche feature
git checkout -b feature/pass-adresses-core

# 3. Développer avec Claude Code (commits réguliers)
git add . && git commit -m "feat: add pass adresses questionnaire"

# 4. Pousser → déclenche automatiquement une preview Vercel
git push origin feature/pass-adresses-core

# 5. Tester sur l'URL preview générée par Vercel
# URL : https://brikii-feature-pass-adresses-[hash].vercel.app

# 6. Si tout est OK → créer une Pull Request sur GitHub
# 7. Valider → merge dans main → déploiement production automatique

# 8. Supprimer la branche après merge
git branch -d feature/pass-adresses-core
```

### Conventions de commits

```
feat:     nouvelle fonctionnalité
fix:      correction de bug
chore:    maintenance, dépendances
docs:     documentation
refactor: refactorisation sans nouveau comportement
style:    formatage, pas de changement logique
test:     ajout ou modification de tests
db:       migration base de données

# Exemples
feat: add BIA PDF generation with docxtemplater
fix: fix OTP SMS expiration check
db: add pass_relances table migration
chore: update dependencies
```

---

## 7. Déploiement

### Configuration Vercel

```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "devCommand": "next dev",
  "installCommand": "npm install",
  "regions": ["cdg1"],
  "env": {
    "NEXT_PUBLIC_APP_URL": {
      "production": "https://brikii.app",
      "preview": "https://staging.brikii.app"
    }
  }
}
```

**Région Vercel :** `cdg1` (Paris) — proximité avec Supabase Frankfurt.

### Déploiements automatiques

| Événement | Environnement | URL |
|-----------|---------------|-----|
| Push sur `feature/*` | Preview | `brikii-[branch]-[hash].vercel.app` |
| Push sur `main` | Production | `brikii.app` |

### Domaines

| Environnement | Domaine |
|---------------|---------|
| Production app | `brikii.app` |
| Production vitrine | `pools.immo` |
| Preview | Auto-généré par Vercel |

---

## 8. Variables d'environnement

### .env.example (commité sur Git)

```bash
# ============================================
# BRIKII — Variables d'environnement
# Copier ce fichier en .env.local et remplir
# NE JAMAIS commiter .env.local
# ============================================

# --- APPLICATION ---
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_POOLS_IMMO_URL=http://localhost:3001
NODE_ENV=development

# --- SUPABASE ---
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_DB_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# --- CLOUDFLARE IMAGES ---
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_IMAGES_BASE_URL=https://images.brikii.fr

# --- RESEND (emails) ---
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@brikii.app
RESEND_FROM_NAME=Brikii

# --- TWILIO (SMS) ---
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=+33...

# --- STRIPE ---
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# --- MAPBOX ---
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...

# --- UPSTASH REDIS (rate limiting) ---
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=

# --- N8N (scraping annonces) ---
N8N_WEBHOOK_URL=https://n8n.batimmo.com/webhook/...
N8N_WEBHOOK_SECRET=

# --- SENTRY ---
NEXT_PUBLIC_SENTRY_DSN=https://...
SENTRY_AUTH_TOKEN=

# --- API ADRESSE GOUV (géocodage) ---
# Gratuit, pas de clé requise
NEXT_PUBLIC_API_ADRESSE_URL=https://api-adresse.data.gouv.fr
```

### Groupes de variables dans Vercel

```
Vercel Dashboard → Settings → Environment Variables

Groupe "Development" :
  → Utilisé uniquement si connecté à Vercel en local (vercel env pull)

Groupe "Preview" :
  → Appliqué automatiquement à toutes les previews (branches feature/*)
  → Pointe vers Supabase STAGING

Groupe "Production" :
  → Appliqué uniquement sur la branche main
  → Pointe vers Supabase PROD
  → Clés Stripe live (pas test)
  → Twilio live
```

### Variables sensibles — règles absolues

```
❌ Jamais de secret dans le code source
❌ Jamais de .env.local commité sur Git
❌ Jamais de clé PROD dans .env.local
✅ .gitignore inclut : .env.local, .env.*.local
✅ Clés différentes par environnement (dev/stg/prod)
✅ Rotation des clés API tous les 6 mois
✅ Service role Supabase uniquement côté serveur
```

---

## 9. Services tiers

### Cloudflare Images — URLs

```
Format : https://images.brikii.fr/[type]/[identifiant]/[hash].[ext]

Photos biens    : images.brikii.fr/biens/[ref]/[hash].jpg
Logos pools     : images.brikii.fr/pools/[id]/logo.jpg
Avatars users   : images.brikii.fr/users/[id]/avatar.jpg
Logos agences   : images.brikii.fr/agences/[id]/logo.jpg
Signatures      : images.brikii.fr/signatures/[hash].png
QR Codes        : images.brikii.fr/qrcodes/[hash].png
```

### Twilio — OTP SMS

```typescript
// lib/twilio/otp.ts
const OTP_CONFIG = {
  length: 6,            // 6 chiffres
  expiry: 10 * 60,      // 10 minutes en secondes
  maxAttempts: 3,       // 3 tentatives max avant blocage
  cooldown: 60,         // 60s entre deux envois
}
// Code stocké en hash bcrypt (jamais en clair)
// Vérifié avec bcrypt.compare()
```

### Resend — Emails

```typescript
// Tous les emails partent de noreply@brikii.app
// Templates dans /emails/*.tsx (React Email)
// Preview locale : npx react-email dev
```

### Stripe — Abonnements

```typescript
// Webhooks à configurer dans Stripe Dashboard :
// POST /api/webhooks/stripe
// Événements à écouter :
const STRIPE_EVENTS = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'checkout.session.completed',
]
```

### n8n — Scraping annonces

```typescript
// Appel depuis /api/biens/scrape
// POST vers N8N_WEBHOOK_URL avec signature HMAC
// Timeout : 30 secondes
// Retry : 2 fois en cas d'échec
const payload = {
  url: 'https://seloger.com/annonces/123456',
  user_id: 'uuid',
  timestamp: Date.now(),
  signature: hmac(N8N_WEBHOOK_SECRET, url + timestamp)
}
```

### Génération BIA PDF

```typescript
// lib/bia/generator.ts
// 1. Charger le template Word (BIA_v2.docx)
// 2. Remplacer les variables avec docxtemplater
// 3. Convertir en PDF via LibreOffice (soffice headless)
// 4. Uploader le PDF sur Supabase Storage
// 5. Retourner l'URL signée (expiration 24h)

// Template stocké dans : /templates/BIA_v2.docx
// Variables → voir PRD.md Annexe B
```

---

## 10. Sécurité

### Row Level Security — principe

```sql
-- RÈGLE ABSOLUE : RLS activé sur toutes les tables
ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;

-- Pattern de base : un user ne voit que ses données
CREATE POLICY "owner_only" ON [table]
  FOR ALL USING (auth.uid() = user_id);
```

### Headers de sécurité HTTP

```typescript
// next.config.ts
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
]
```

### Rate limiting (Upstash Redis)

```typescript
// lib/rate-limit.ts
const LIMITS = {
  login:          { requests: 5,    window: '15m' },
  resetPassword:  { requests: 3,    window: '1h'  },
  otpSms:         { requests: 3,    window: '10m' },
  createBia:      { requests: 10,   window: '1h'  },
  scrapeUrl:      { requests: 20,   window: '1h'  },
  apiGlobal:      { requests: 1000, window: '1h'  },
}
```

### Validation des entrées

```typescript
// Toutes les API Routes valident avec Zod
// Jamais de données brutes insérées en BDD
// Schémas dans lib/validations/
import { z } from 'zod'
```

### Audit logs

```sql
-- Toutes les actions sensibles sont tracées
-- Table audit_logs avec : user_id, action, table_name,
-- record_id, old_values, new_values, ip_address, user_agent
```

---

## 11. Performance et scalabilité

### Stratégie de cache Next.js

```typescript
// Server Components : cache par défaut
// Revalidation toutes les 60s pour les données publiques
export const revalidate = 60

// Données temps réel (notifications, pools) : no-cache
export const dynamic = 'force-dynamic'

// Pages statiques (landing, CGU) : cache permanent
export const revalidate = false
```

### Optimisation images

```typescript
// Toujours utiliser next/image pour les photos biens
// Cloudflare Images génère automatiquement les variantes :
// ?w=400  → thumbnails liste
// ?w=1200 → fiche bien full
// Format WebP automatique si supporté
```

### Indexes PostgreSQL prioritaires

```sql
-- Index sur les colonnes de recherche fréquente
CREATE INDEX idx_biens_user_id ON biens(user_id);
CREATE INDEX idx_biens_statut ON biens(statut);
CREATE INDEX idx_pool_membres_pool ON pool_membres(pool_id);
CREATE INDEX idx_pass_adresses_user ON pass_adresses(user_id);
CREATE INDEX idx_contacts_user ON contacts(user_id);

-- Index géographique pour les requêtes de rayon
CREATE INDEX idx_biens_location ON biens USING GIST(
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);
```

### Scalabilité

Vercel gère automatiquement la scalabilité horizontale des Server Functions. En cas de croissance importante :

- Migration vers **VPS Hetzner** possible (voir section 12)
- Connection pooling Supabase via **PgBouncer** (activé par défaut)
- CDN Cloudflare pour les assets statiques

---

## 12. Portabilité future

### Migration vers VPS Hetzner

L'architecture est conçue pour être portable. Migration possible sans réécriture :

```
Vercel → Docker + Nginx sur Hetzner VPS

Étapes :
1. Créer Dockerfile (Next.js standalone output)
2. Configurer Nginx comme reverse proxy
3. Mettre en place CI/CD custom (GitHub Actions)
4. Migrer les variables d'environnement
5. Configurer SSL (Certbot / Let's Encrypt)

Prérequis préparés dès maintenant :
- next.config.ts avec output: 'standalone'
- .dockerignore
- docker-compose.yml (non activé)
```

### Dockerfile préparé (non utilisé en production initiale)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### next.config.ts — option standalone

```typescript
// Activé dès le départ pour portabilité future
const nextConfig = {
  output: 'standalone',  // Prépare la migration Docker
  // ...
}
```

---

## 13. Conventions de nommage

### Fichiers et dossiers

```
Composants React   : PascalCase   → BienCard.tsx, PassAdresseForm.tsx
Pages Next.js      : lowercase    → page.tsx, layout.tsx
API Routes         : lowercase    → route.ts
Hooks              : camelCase    → useBiens.ts, useUser.ts
Utilitaires        : camelCase    → formatPrice.ts, generateToken.ts
Types              : PascalCase   → Bien.ts, PassAdresse.ts
```

### Variables et fonctions TypeScript

```typescript
// Variables : camelCase
const userEmail = 'test@brikii.app'
const isLoading = false

// Fonctions : camelCase, verbe d'action
async function createPassAdresse() {}
function formatBienPrice(price: number) {}

// Constantes : SCREAMING_SNAKE_CASE
const MAX_BIA_PER_MONTH = 30
const OTP_EXPIRY_SECONDS = 600

// Types et interfaces : PascalCase
interface BienDetails {}
type PassAdresseStatut = 'brouillon' | 'envoye' | 'accepte'

// Enums : PascalCase
enum BienType {
  Maison = 'maison',
  Appartement = 'appartement',
}
```

### Base de données

```sql
-- Tables        : snake_case, pluriel
-- Colonnes      : snake_case
-- Index         : idx_[table]_[colonne]
-- Policies RLS  : [action]_[description]
-- Fonctions     : snake_case, verbe d'action
```

### API Routes

```
GET    /api/biens              → liste des biens
GET    /api/biens/[id]         → détail d'un bien
POST   /api/biens              → créer un bien
PATCH  /api/biens/[id]         → modifier un bien
DELETE /api/biens/[id]         → supprimer (soft) un bien

POST   /api/pass-adresses                    → créer demande
GET    /api/pass-adresses/[id]               → détail demande
POST   /api/pass-adresses/[id]/accept        → accepter
POST   /api/pass-adresses/[id]/refuse        → refuser
POST   /api/pass-adresses/questionnaire/[token] → réponse prospect (public)
```

---

## 14. Checklist jour 1

Avant d'écrire la première ligne de code applicatif :

### GitHub
- [ ] Créer le repository privé `brikii`
- [ ] Configurer la branche `main` comme protégée
- [ ] Activer la règle "Pull Request required before merge"
- [ ] Ajouter `.gitignore` avec `.env.local`, `node_modules`, `.next`

### Supabase
- [ ] Créer le projet `brikii-dev` (région eu-west-1)
- [ ] Créer le projet `brikii-stg` (région eu-west-1)
- [ ] Créer le projet `brikii-prod` (région eu-west-1, plan Pro)
- [ ] Activer PostGIS sur les 3 projets
- [ ] Activer pgcrypto sur les 3 projets
- [ ] Noter les URLs et clés des 3 projets

### Vercel
- [ ] Créer le projet `brikii` connecté au repo GitHub
- [ ] Configurer le domaine `brikii.app` (production)
- [ ] Configurer le domaine `pools.immo` (production)
- [ ] Ajouter les variables d'environnement Preview (→ Supabase STG)
- [ ] Ajouter les variables d'environnement Production (→ Supabase PROD)
- [ ] Sélectionner la région `cdg1` (Paris)

### Comptes tiers à configurer
- [ ] Cloudflare Images — créer le compte et le bucket `brikii`
- [ ] Resend — créer le compte, vérifier le domaine `brikii.app`
- [ ] Twilio — créer le compte, acheter un numéro français
- [ ] Stripe — configurer les produits et plans d'abonnement
- [ ] Mapbox — créer le compte, noter le token public
- [ ] Upstash — créer une base Redis
- [ ] Sentry — créer le projet Next.js
- [ ] UptimeRobot — créer les monitors pour brikii.app et pools.immo

### Projet Next.js
- [ ] `npx create-next-app@latest brikii --typescript --tailwind --app`
- [ ] Installer shadcn/ui : `npx shadcn@latest init`
- [ ] Installer Supabase : `npm install @supabase/auth-helpers-nextjs`
- [ ] Créer `.env.local` depuis `.env.example`
- [ ] Configurer `next.config.ts` (headers sécurité + standalone output)
- [ ] Créer la structure de dossiers (`app/`, `lib/`, `components/`, etc.)
- [ ] Premier commit et push → vérifier le déploiement preview Vercel

### Base de données
- [ ] Initialiser Supabase CLI : `supabase init`
- [ ] Lier au projet dev : `supabase link --project-ref [DEV_REF]`
- [ ] Créer la première migration : `supabase migration new initial_schema`
- [ ] Écrire le schéma complet des 38 tables
- [ ] Appliquer en dev : `supabase db push`
- [ ] Générer les types TypeScript : `supabase gen types typescript`

---

*Document créé le 17 avril 2026 — Version 1.0*
*Maintenu par : équipe Brikii*
*Prochaine révision : à chaque décision technique majeure*
