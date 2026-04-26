# PRD — Brikii
## Product Requirements Document
**Version 1.1 — Avril 2026**
**Statut : En cours de développement**

---

## Table des matières

1. [Vision du produit](#1-vision-du-produit)
2. [Architecture technique](#2-architecture-technique)
3. [Environnements](#3-environnements)
4. [Authentification & utilisateurs](#4-authentification--utilisateurs)
5. [Module Pass'Adresses](#5-module-passadresses)
6. [Module Brikii Pool](#6-module-brikii-pool)
7. [Module Immo Cloud](#7-module-immo-cloud)
8. [Gestion des biens](#8-gestion-des-biens)
9. [Mandats](#9-mandats)
10. [Carnet d'adresses](#10-carnet-dadresses)
11. [Abonnements & crédits](#11-abonnements--crédits)
12. [Notifications & alertes](#12-notifications--alertes)
13. [Statistiques](#13-statistiques)
14. [Back-office admin](#14-back-office-admin)
15. [Site vitrine pools.immo](#15-site-vitrine-poolsimmo)
16. [Emails transactionnels](#16-emails-transactionnels)
17. [Base de données — schéma complet](#17-base-de-données--schéma-complet)
18. [Plan de développement](#18-plan-de-développement)
19. [Sécurité](#19-sécurité)
20. [Conformité RGPD](#20-conformité-rgpd)

---

## Organisation documentaire

L'architecture produit distingue deux niveaux. Les spécifications détaillées sont dans `/docs/`.

### Briques fonctionnelles — modules commercialisables

| Brique | Résumé | Spécification | Priorité |
|--------|--------|---------------|----------|
| **Pass'Adresses** | Sécurisation adresses, BIA, qualification prospect | [docs/briques/pass-adresses.md](docs/briques/pass-adresses.md) | MVP V1 |
| **ImmoCloud** | Dossier documentaire du bien, niveaux d'accès, traçabilité | [docs/briques/immo-cloud.md](docs/briques/immo-cloud.md) | V2 |
| **Brikii Pool** | Collaboration interprofessionnelle, partage mandats, rétrocession | [docs/briques/brikii-pool.md](docs/briques/brikii-pool.md) | V2 |

### Socle métier — cœur applicatif

| Entité | Résumé | Spécification | Priorité |
|--------|--------|---------------|----------|
| **Biens** | CRUD biens immobiliers, import URL, photos, statuts | [docs/socle/biens.md](docs/socle/biens.md) | MVP V1 |
| **Mandats** | Cycle de vie mandats, document PDF, alertes expiration | [docs/socle/mandats.md](docs/socle/mandats.md) | MVP V1 |
| **Contacts** | CRM multi-rôles, historique, alertes biens | [docs/socle/contacts.md](docs/socle/contacts.md) | MVP V1 |
| **Transactions** | Offres, compromis, acte — suivi jusqu'à la vente | [docs/socle/transactions.md](docs/socle/transactions.md) | V2 |

> **Règle absolue :** toute modification de base de données passe par une migration numérotée. Jamais de modification destructive.

---

## 1. Vision du produit

### 1.1 Présentation générale

**Brikii** est une plateforme modulaire d'outils métiers dédiée aux professionnels de l'immobilier. Elle repose sur une logique de **briques logicielles indépendantes mais interconnectées**, chacune répondant à un besoin précis du terrain.

**URL de l'application :** `brikii.fr`
**URL de la vitrine publique :** `pools.immo`
**Hébergement photos :** `images.brikii.fr` (Cloudflare Images)

### 1.2 Philosophie

- **Modulaire** — chaque brique fonctionne seule ou avec les autres
- **Mobile first** — optimisé pour une utilisation terrain sur mobile et tablette
- **Sécurisé** — traçabilité complète des accès aux données sensibles
- **Automatisé** — réduction maximale des tâches répétitives
- **Évolutif** — architecture pensée pour grandir sans tout refaire

### 1.3 Modules principaux

| Module | Description | Priorité |
|--------|-------------|----------|
| **Pass'Adresses** | Sécurisation de la communication des adresses — génération de BIA | MVP V1 |
| **Brikii Pool** | Collaboration interprofessionnelle — partage de mandats | V2 |
| **Immo Cloud** | Centralisation et gestion documentaire | V2 |
| **Gestion des biens** | CRUD complet des biens immobiliers | MVP V1 |
| **Mandats** | Suivi des mandats de vente | MVP V1 |
| **Carnet d'adresses** | CRM immobilier — contacts multi-rôles | MVP V1 |

### 1.4 Utilisateurs cibles

- Agents immobiliers
- Mandataires immobiliers
- Négociateurs salariés
- Responsables d'agence
- Responsables de réseaux de mandataires

### 1.5 Positionnement

Brikii n'est pas un logiciel immobilier traditionnel. Il **complète** les outils existants en comblant les manques : collaboration interprofessionnelle, contrôle des accès aux données sensibles, automatisation documentaire, traçabilité des échanges.

---

## 2. Architecture technique

### 2.1 Stack technique

| Couche | Technologie | Rôle |
|--------|-------------|------|
| Frontend | Next.js 14 (App Router) | Interface utilisateur |
| UI | shadcn/ui + Tailwind CSS | Composants et design |
| Backend | Next.js API Routes | API REST |
| Base de données | PostgreSQL via Supabase | Données relationnelles |
| Auth | Supabase Auth | Authentification |
| Stockage fichiers | Supabase Storage | Documents privés |
| Stockage photos | Cloudflare Images | Photos des biens |
| Emails | Resend + React Email | Emails transactionnels |
| SMS | Twilio | OTP + relances SMS |
| Paiements | Stripe | Abonnements + facturation |
| Cartes | Mapbox | Géolocalisation + cartes |
| Scraping annonces | n8n (workflow existant) | Import depuis portails |
| Géocodage | API Adresse (gouv.fr) | Codes postaux → GPS |
| Monitoring | Sentry + UptimeRobot | Erreurs + disponibilité |
| Hébergement | Vercel (puis VPS Hetzner) | Déploiement |

### 2.2 Structure des URLs Cloudflare Images

```
Photos biens    : https://images.brikii.fr/biens/[reference]/[hash].jpg
Logos pools     : https://images.brikii.fr/pools/[id]/logo.jpg
Avatars users   : https://images.brikii.fr/users/[id]/avatar.jpg
Logos agences   : https://images.brikii.fr/agences/[id]/logo.jpg
Signatures      : https://images.brikii.fr/signatures/[hash].png
QR Codes        : https://images.brikii.fr/qrcodes/[hash].png
```

### 2.3 Intégration n8n (scraping annonces)

Brikii envoie une URL d'annonce via webhook HTTP POST à n8n :

```json
// Requête Brikii → n8n
POST /webhook/recup-infos-annonce
{
  "url": "https://seloger.com/annonces/123456",
  "user_id": "uuid"
}

// Réponse n8n → Brikii
{
  "type": "maison",
  "prix": 479000,
  "surface_hab": 206,
  "surface_terrain": 1700,
  "ville": "Albi",
  "code_postal": "81000",
  "nb_pieces": 8,
  "nb_chambres": 7,
  "nb_sdb": 1,
  "etat_general": "bon état",
  "travaux": false,
  "descriptif": "...",
  "taxe_fonciere": 2400,
  "honoraires_charge": "vendeur",
  "honoraires_montant": 18000,
  "photos": ["https://..."],
  "source_url": "https://...",
  "source_portail": "SeLoger"
}
```

Les photos sont automatiquement téléchargées et re-hébergées sur Cloudflare Images.

---

## 3. Environnements

### 3.1 Trois environnements

| Environnement | Branche Git | URL | Supabase | Usage |
|--------------|-------------|-----|----------|-------|
| DEV | `develop` | localhost:3000 | Local | Développement |
| STAGING | `staging` | staging.brikii.fr | Projet staging | Tests |
| PROD | `main` | brikii.fr | Projet prod | Production |

### 3.2 Stratégie de branches Git

```
main (production)
  ↑ merge après validation staging
staging
  ↑ merge après validation dev
develop
  ↑ merge des features
feature/[nom-fonctionnalite]
```

### 3.3 Variables d'environnement

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cloudflare Images
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_IMAGES_HASH=

# Resend (emails)
RESEND_API_KEY=

# Twilio (SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=

# n8n
N8N_WEBHOOK_URL=
N8N_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_POOLS_IMMO_URL=
```

### 3.4 Migrations base de données

Toutes les modifications de BDD passent par des fichiers de migration numérotés :

```
migrations/
  001_create_users.sql
  002_create_agences.sql
  003_create_biens.sql
  ...
```

**Règle absolue : jamais de modification directe en production.**

### 3.5 Backup et restauration

- Backup automatique Supabase toutes les 24h
- Rétention 30 jours
- Objectif de restauration : moins d'1 heure

---

## 4. Authentification & utilisateurs

### 4.1 Inscription

**Champs obligatoires :**
- Civilité (M. / Mme)
- Prénom, Nom
- Email (unique)
- Téléphone
- Mot de passe (min 8 caractères)
- Statut professionnel : Agent immobilier / Mandataire / Négociateur / Responsable agence
- Agence ou réseau mandant (obligatoire pour tous)
- SIREN (si agent / négociateur / responsable)
- RSAC (si mandataire)

**Process d'inscription :**
1. Formulaire rempli → email de confirmation envoyé
2. Clic sur le lien → email vérifié
3. Compte actif → email de bienvenue + guide démarrage
4. Période d'essai 30 jours démarrée automatiquement

### 4.2 Connexion

- Email + mot de passe
- Session persistante (JWT Supabase)
- Mot de passe oublié → email de réinitialisation (lien valable 1h)

### 4.3 Depuis pools.immo

Quand un visiteur clique sur un bien et n'est pas connecté :
- Page intermédiaire avec deux options : Se connecter / S'inscrire
- Après auth → redirection automatique vers la fiche du bien sur Brikii

### 4.4 Rôles utilisateurs

| Rôle | Droits |
|------|--------|
| `agent_immobilier` | Accès complet à ses données |
| `mandataire` | Accès complet à ses données |
| `negociateur` | Accès selon agence |
| `responsable_agence` | Accès données agence + membres |
| `admin_brikii` | Accès total back-office |

---

## 5. Module Pass'Adresses

### 5.1 Description

Pass'Adresses permet de sécuriser la communication des adresses de biens immobiliers en générant un **Bon d'Indication d'Adresse (BIA)** après qualification du prospect.

### 5.2 Workflow complet

```
1. Agent crée la demande
   → Sélectionne le bien + mandat
   → Choisit un template ou configure manuellement
   → Sélectionne le prospect (email connu)
   → Brikii génère magic_token + landing_token

2. Email envoyé au prospect
   → Mini landing page du bien incluse
   → Bouton "Répondre au questionnaire" (magic link)
   → Magic link valable 48h

3. Prospect ouvre le questionnaire (sans inscription)
   → Remplit ses informations
   → Reçoit SMS avec code OTP (6 chiffres, valable 10 min)
   → Saisit le code → téléphone vérifié
   → Upload CNI si demandée
   → Signe manuscritement si demandée (canvas HTML)
   → Remplit critères de recherche si demandés
   → Soumet → magic link invalidé immédiatement

4. Brikii calcule le score automatiquement
   → Notifie l'agent par email + notification in-app

5. Agent traite la demande
   → ACCEPTER → BIA généré en PDF → envoyé prospect + vendeur
   → REFUSER → email de refus envoyé au prospect
   → COMPLÉMENT → nouveau magic link envoyé au prospect

6. Relances automatiques si pas de réponse
   → J+1 (24h) : email de relance
   → J+2 (48h) : SMS de relance
   → J+3 (72h) : archivage automatique
```

### 5.3 Questionnaire prospect — options paramétrables

| Option | Description |
|--------|-------------|
| `doc_identite_demande` | Demander une pièce d'identité |
| `doc_identite_obligatoire` | Rendre la pièce d'identité obligatoire |
| `signature_manuscrite` | Ajouter un champ signature canvas |
| `criteres_recherche` | Demander les critères de recherche |
| `coordonnees_dans_bia` | Afficher tél + email dans le BIA |
| `verification_sms` | Vérifier le téléphone par OTP SMS |

### 5.4 Zone de recherche prospect

Mode unique : **code postal + rayon en km**

```sql
zone_code_postal    VARCHAR(10)
zone_ville          VARCHAR(100)    -- auto-rempli via API Adresse
zone_lat            DECIMAL(10,8)   -- géocodé automatiquement
zone_lng            DECIMAL(11,8)
zone_rayon_km       INTEGER
```

### 5.5 Scoring prospect

Score calculé automatiquement sur 10 points :

| Critère | Points |
|---------|--------|
| Téléphone vérifié (OTP SMS) | 2 pts |
| Email renseigné | 1 pt |
| Adresse postale renseignée | 1 pt |
| Pièce d'identité fournie | 2 pts |
| Signature manuscrite fournie | 1 pt |
| Critères de recherche renseignés | 1 pt |
| Budget cohérent avec le prix du bien | 1 pt |
| Délai de réponse < 1h | 0.5 pt |
| Secteur cohérent avec localisation du bien | 0.5 pt |

**Grille de notation :**
- Score ≥ 8 → **A** (Très bon)
- Score ≥ 6 → **B** (Bon)
- Score ≥ 4 → **C** (Moyen)
- Score < 4 → **D** (Faible)

### 5.6 Génération du BIA

- Template Word avec variables → export PDF automatique
- Le BIA est généré uniquement après validation par l'agent
- Envoyé automatiquement au prospect ET au vendeur
- Stocké dans Supabase Storage
- Structure : 6 pages (en-tête agence, parties, articles contractuels, clauses RGPD, validation électronique)

**Éléments de preuve conservés :**
- Signature manuscrite (image PNG)
- Horodatage exact
- Adresse IP du prospect
- User agent (navigateur / appareil)
- Hash du code OTP validé
- Date et heure de validation SMS

### 5.7 Valeur juridique

- Brikii est prestataire de services informatiques — outil de mise en contact uniquement
- Le SMS OTP vaut début de preuve (pas signature électronique au sens légal)
- La combinaison SMS OTP + horodatage + IP + signature canvas constitue un dossier de preuve robuste

### 5.8 Templates de questionnaire

L'agent peut sauvegarder des templates prédéfinis :
- **Standard** — toutes les options activées
- **Rapide** — sans pièce d'identité
- **Premium** — avec signature + pièce d'identité obligatoire
- **Personnalisé** — configuration libre sauvegardée

### 5.9 Fonctionnalités supplémentaires Pass'Adresses

| Fonctionnalité | Version |
|----------------|---------|
| Relances automatiques email + SMS | MVP |
| Scoring intelligent A/B/C/D | MVP |
| Historique demandes par prospect | MVP |
| Mini landing page du bien | MVP |
| Templates de questionnaire | MVP |
| Stats avancées (taux acceptation, score moyen...) | MVP |
| Demande d'adresse depuis pools.immo | MVP |
| Notification vendeur à l'acceptation | MVP |
| QR Code par bien | MVP |
| Widget intégrable sur site agence | V2 |
| Intégration portails immobiliers | V2 |
| Partage demande entre confrères pool | V2 |

---

## 6. Module Brikii Pool

### 6.1 Description

Brikii Pool est un espace de collaboration structuré entre professionnels de l'immobilier permettant de partager des mandats dans un cadre sécurisé avec règles de rétrocession définies.

### 6.2 Types de pools

| Type | Description |
|------|-------------|
| **Ouvert** | Les membres peuvent inviter d'autres confrères |
| **Fermé** | Seul l'admin peut inviter — validation obligatoire |

### 6.3 Visibilité

- Tous les pools ouverts sont visibles sur pools.immo par défaut
- L'admin peut choisir de masquer son pool
- Les pools fermés ne sont pas visibles sur pools.immo

### 6.4 Types de mandats acceptés

- Tous
- Exclusifs seulement
- Semi-exclusifs
- Recherche

### 6.5 Workflow d'adhésion

```
Invitation envoyée (membre Brikii ou non inscrit)
    ↓
Email d'invitation reçu (token valable 7 jours)
    ↓
Si non inscrit → inscription Brikii obligatoire
    ↓
Charte de collaboration affichée
    ↓
Charte acceptée obligatoirement
    ↓
Accès aux biens du pool activé
```

### 6.6 Règles métier pools

**Exclusion d'un membre :**
- Tous ses biens retirés automatiquement du pool

**Modification de la charte :**
- Nouvelle version générée
- Tous les membres doivent re-signer
- Accès suspendu si non re-signé sous 7 jours

**Bien retiré d'un pool :**
- Demandes d'accès privé existantes → statut "invalide"
- Page d'erreur propre pour les liens existants

**Inactivité d'un bien :**
- Email de relance au détenteur après 30 jours sans activité

### 6.7 Niveaux d'accès aux informations

| Visiteur pools.immo | Membre connecté Brikii |
|---------------------|----------------------|
| Type, prix, secteur approx. | Toutes infos publiques |
| Nom mandataire | Adresse exacte (avec mot de passe) |
| Pas d'adresse exacte | Documents publics et intercabinet |
| Pas de documents | Documents privés sur demande signée |

### 6.8 Rétrocession

- Taux défini par l'agent pour chaque bien
- Peut être écrasé par une règle imposée par le pool
- Hiérarchie : règle pool > taux individuel bien

---

## 7. Module Immo Cloud

### 7.1 Description

Centralisation et gestion intelligente des documents par bien immobilier.

### 7.2 Niveaux d'accès documents

| Niveau | Accès |
|--------|-------|
| **Public** | Visible par tous les membres du pool |
| **Intercabinet** | Visible après acceptation de la charte |
| **Privé** | Visible uniquement après demande + signature |

### 7.3 Fonctionnalités

- Upload multiple fichiers simultanés
- Partage via lien sécurisé (sans authentification requise)
- Traçabilité complète des accès
- Liste dynamique des documents requis selon type de bien
- Alertes documents manquants

### 7.4 Documents requis par type de bien

**Maison / Appartement :**
DPE, diagnostic électricité (>15 ans), diagnostic gaz (>15 ans), ERP, titre de propriété, taxe foncière

**Appartement en plus :**
Règlement copropriété, 3 derniers PV d'AG, fiche synthèse copropriété, pré-état daté, carnet d'entretien

**Terrain :**
Certificat d'urbanisme, titre de propriété, ERP

**Immeuble :**
Titre de propriété, diagnostics par lot, état locatif, baux en cours

### 7.5 Fonctionnalités V2

- Reconnaissance IA automatique des documents
- Suivi automatique des dates de validité des diagnostics

---

## 8. Gestion des biens

### 8.1 Création d'un bien — deux modes

**Mode URL (scraping via n8n) :**
1. Agent colle l'URL de l'annonce
2. Brikii appelle le webhook n8n
3. JSON retourné → pré-remplissage automatique
4. Photos téléchargées et hébergées sur Cloudflare Images
5. Agent vérifie et complète

**Mode manuel :**
Formulaire adaptatif selon le type de bien sélectionné

### 8.2 Types de biens et champs spécifiques

| Type | Table détails | Champs clés |
|------|--------------|-------------|
| Maison | `biens_maisons` | surface_hab, surface_terrain, nb_pièces, garage, piscine |
| Appartement | `biens_appartements` | surface_hab, étage, charges, syndic, ascenseur |
| Terrain | `biens_terrains` | surface_totale, constructible, viabilisé, zone PLU |
| Immeuble | `biens_immeubles` | nb_lots, rendement_brut, loyers_annuels |
| Commerce | `biens_commerces` | surface_vitrine, bail_type, fonds_commerce |
| Entrepôt | `biens_entrepots` | hauteur_plafond, quais_chargement, puissance_élec |
| Local pro | `biens_locaux_pro` | nb_postes_travail, climatisation, fibre |
| Propriété | `biens_proprietes` | dépendances, plan_eau, forêt, vignes, classement |

### 8.3 Statuts d'un bien

- Brouillon
- Sur le marché
- Sous offre
- Vendu
- Archivé

### 8.4 Vues disponibles

- Tableau (liste)
- Cartes (grid)
- Carte géographique (Mapbox)

---

## 9. Mandats

### 9.1 Types de mandats

- Exclusif
- Simple
- Semi-exclusif
- Recherche
- Gestion

### 9.2 Informations d'un mandat

- Numéro, type, statut
- Date signature, date début, durée, date fin (calculée)
- Prix de vente, honoraires (% et montant calculé)
- Charge des honoraires (vendeur / acquéreur / partagé)
- Taux de rétrocession pour les pools
- Propriétaire(s) vendeur(s) — liaison vers contacts
- Document PDF du mandat (upload manuel)

### 9.3 Alertes d'expiration automatiques

- J-30 : email + notification in-app
- J-15 : email + notification in-app
- J-7 : email + SMS + notification in-app
- J-0 : statut → "expiré" automatiquement

---

## 10. Carnet d'adresses

### 10.1 Types de contacts

**Particuliers :**
propriétaire_vendeur, propriétaire_bailleur, locataire, acquéreur, prospect_acquéreur, prospect_vendeur

**Professionnels immobilier :**
agent_immobilier, mandataire, négociateur, notaire, gestionnaire

**Professionnels techniques :**
diagnostiqueur, géomètre, architecte, artisan (maçonnerie, électricité, plomberie, autre), expert_immobilier

**Juridique / Financier :**
avocat, huissier, banquier, courtier_crédit, assureur, comptable

### 10.2 Fonctionnalités

- Un contact peut avoir plusieurs rôles simultanément
- Déduplication automatique (alerte si email/tél déjà existant)
- Tags libres personnalisables
- Rappels associés à un contact
- Historique des interactions (appel, email, SMS, visite, note...)
- Import automatique depuis Pass'Adresses
- Critères de recherche prospect (pour alertes biens)

---

## 11. Abonnements & crédits

### 11.1 Plans

| Plan | Prix mensuel | Prix annuel | Durée essai |
|------|-------------|-------------|-------------|
| Découverte | Gratuit | — | 30 jours |
| Solo | 29€ HT | 23€ HT/mois | — |
| Agence | 79€ HT | 63€ HT/mois | — |
| Réseau | Sur devis | Sur devis | — |

### 11.2 Quotas par plan

| Quota | Découverte | Solo | Agence | Réseau |
|-------|-----------|------|--------|--------|
| BIA / mois | 5 | 30 | 100 | Illimité |
| Biens dans pools | 2 | 20 | Illimité | Illimité |
| Pools créés | 1 | 3 | Illimité | Illimité |
| Stockage | 500 Mo | 5 Go | 25 Go | Illimité |
| Mandats | 3 | Illimité | Illimité | Illimité |
| Utilisateurs | 1 | 1 | 5 | Illimité |

### 11.3 Fonctionnalités par plan

| Fonctionnalité | Découverte | Solo | Agence | Réseau |
|----------------|-----------|------|--------|--------|
| Alertes biens | ❌ | ✅ | ✅ | ✅ |
| Parrainage crédits | ❌ | ✅ | ✅ | ✅ |
| Stats avancées | ❌ | ✅ | ✅ | ✅ |
| Export données | ❌ | ❌ | ✅ | ✅ |
| Support chat | ❌ | ❌ | ✅ | ✅ |
| API | ❌ | ❌ | ❌ | ✅ |

### 11.4 Système de crédits

**Gains :**
- +10 crédits : parrainage Brikii validé (filleul souscrit un plan payant)
- +5 crédits : invitation pool acceptée
- +5 crédits : bonus bienvenue à l'inscription

**Utilisation :**
- 1 crédit = 1 BIA supplémentaire hors quota
- 1 crédit = 1 bien pool supplémentaire hors quota
- 50 crédits = 1 mois offert sur l'abonnement

**Packs de crédits achetables :**
- Pack Starter : 10 crédits → 9€ HT
- Pack Standard : 25 crédits → 19€ HT
- Pack Premium : 60 crédits → 39€ HT

**Expiration :**
- Crédits gagnés par parrainage → n'expirent pas
- Crédits bonus admin → expiration à 12 mois

### 11.5 Dépassement de quota

Quand l'agent atteint son quota mensuel :
1. Proposition d'utiliser ses crédits disponibles
2. Proposition d'acheter un pack de crédits

### 11.6 Facturation

- Facturation automatique via Stripe
- Euros uniquement
- TVA 20%
- Export comptable des factures disponible
- Conformité facturation électronique

---

## 12. Notifications & alertes

### 12.1 Canaux de notification

- **In-app** : cloche en haut à droite de l'interface
- **Email** : via Resend
- **SMS** : via Twilio
- **Push mobile** : (V2)

### 12.2 Préférences utilisateur

L'utilisateur peut activer/désactiver chaque canal indépendamment.

### 12.3 Types de notifications

**Pass'Adresses :**
BIA réponse reçue, acceptée, refusée, complément demandé, relance envoyée, archivée automatiquement

**Biens :**
Bien inactif depuis 30 jours, bien sous offre, bien vendu

**Pools :**
Invitation reçue/acceptée, nouveau membre, membre exclu, charte modifiée, bien ajouté, demande accès privé, accès accordé/refusé

**Mandats :**
Expiration J-30, J-15, J-7, J-0

**Documents :**
Document manquant, document expiré

**Abonnement :**
Trial bientôt expiré, quota atteint, paiement échoué, facture disponible

**Crédits :**
Crédits gagnés, parrainage validé

### 12.4 Alertes biens

Critères configurables par l'utilisateur :
- Types de biens
- Fourchette de prix
- Surface minimum
- Nombre de pièces minimum
- Zone géographique (code postal + rayon km)
- Périmètre : tous les biens ou pools spécifiques

Fréquences : immédiat / quotidien / hebdomadaire

---

## 13. Statistiques

### 13.1 Tableau de bord utilisateur

**Pass'Adresses :**
- Nombre de BIA créés / envoyés / acceptés / refusés ce mois
- Taux d'acceptation (%)
- Score moyen des prospects
- Délai moyen de réponse
- Évolution mensuelle

**Biens :**
- Biens actifs / sous offre / vendus
- Biens les plus demandés (via Pass'Adresses)

**Pools :**
- Nombre de pools admin / membre
- Biens partagés actifs

**Crédits :**
- Solde actuel
- Gains et dépenses du mois

### 13.2 Tableau de bord pool (admin)

- Nombre de membres actifs
- Nombre de biens partagés
- Activité mensuelle
- Vues sur pools.immo

---

## 14. Back-office admin

Accessible uniquement au rôle `admin_brikii`.

### 14.1 Gestion des utilisateurs

- Liste complète des utilisateurs
- Filtres par plan, statut, date d'inscription
- Modifier le plan d'un utilisateur
- Attribuer des crédits manuellement
- Suspendre / réactiver un compte

### 14.2 Gestion des abonnements

- Vue globale des abonnements actifs
- Revenus mensuels (MRR)
- Taux de churn
- Gestion des plans et quotas

### 14.3 Gestion des crédits

- Attribution manuelle de crédits
- Historique des mouvements

### 14.4 Statistiques globales

- Nombre d'utilisateurs total / actifs / trial
- Nombre de BIA générés
- Nombre de pools actifs
- Revenus

### 14.5 Gestion des nouveautés

- Créer / modifier / publier des articles de nouveautés
- Notifier les utilisateurs

### 14.6 Page statut service

- Statut en temps réel de chaque service
- Création d'incidents
- Historique des pannes

### 14.7 Support tickets

- Vue globale des tickets
- Attribution et traitement
- Statistiques de résolution

---

## 15. Site vitrine pools.immo

### 15.1 Description

Site public distinct de Brikii, partageant la même base de données. Vitrine des pools et biens publics.

### 15.2 Informations affichées publiquement

**Pools :**
- Nom, secteur géographique, admin, nb biens, nb membres
- Statut ouvert/fermé, types de mandats acceptés
- Mini carte de localisation

**Biens :**
- Type, prix, secteur approximatif (jamais l'adresse exacte)
- Nombre de pièces, surface
- Statut (sur le marché / sous offre)
- Nom et agence du mandataire
- Pool d'appartenance

### 15.3 Redirection vers Brikii

**Clic sur un bien → deux cas :**

*Session Brikii active :*
→ Redirection directe vers la fiche complète du bien sur Brikii

*Non connecté :*
→ Page intermédiaire avec formulaire de connexion (gauche) et CTA inscription (droite)
→ Après auth → redirection vers la fiche du bien

### 15.4 Bouton "Demander l'adresse"

Sur chaque bien de pools.immo :
- Bouton visible sans être connecté
- Ouvre le questionnaire Pass'Adresses via magic link
- Sans inscription requise pour le prospect

---

## 16. Emails transactionnels

Tous les emails sont gérés via **Resend + React Email**.
Design cohérent avec la charte graphique Brikii (fond sombre header, accent jaune #F5C842).

### 16.1 Authentification
- Confirmation email à l'inscription
- Email de bienvenue + guide démarrage
- Réinitialisation mot de passe

### 16.2 Pass'Adresses
- Questionnaire envoyé au prospect (avec magic link + mini landing page)
- Rappel si pas de réponse (24h)
- Relance SMS (48h)
- Nouvelle réponse à traiter (agent)
- BIA généré et envoyé (prospect)
- BIA copie (vendeur)
- Demande acceptée — confirmation (prospect)
- Demande refusée (prospect)
- Complément d'information demandé (prospect)

### 16.3 Pools
- Invitation à rejoindre un pool
- Rappel invitation non acceptée (72h)
- Demande d'accès validée / refusée
- Charte mise à jour — re-signature requise
- Nouveau bien ajouté dans le pool
- Nouveau membre rejoint le pool

### 16.4 Mandats
- Mandat expirant dans 30 jours
- Mandat expirant dans 7 jours
- Mandat expiré

### 16.5 Abonnement & facturation
- Fin de trial dans 7 jours
- Trial expiré
- Abonnement activé
- Paiement échoué
- Facture disponible
- Parrainage validé — crédits attribués

### 16.6 Système
- Maintenance programmée
- Nouvelle fonctionnalité disponible

---

## 17. Base de données — schéma complet

### 17.1 Liste des tables (38 tables)

#### UTILISATEURS
```sql
users                   -- Professionnels inscrits
agences                 -- Agences et réseaux
agence_membres          -- Liaison users ↔ agences
```

#### BIENS
```sql
biens                   -- Table centrale des biens
biens_maisons           -- Détails spécifiques maisons
biens_appartements      -- Détails spécifiques appartements
biens_terrains          -- Détails spécifiques terrains
biens_immeubles         -- Détails spécifiques immeubles
biens_commerces         -- Détails spécifiques commerces
biens_entrepots         -- Détails spécifiques entrepôts
biens_locaux_pro        -- Détails spécifiques locaux professionnels
biens_proprietes        -- Détails spécifiques propriétés/domaines
```

#### MANDATS
```sql
mandats                 -- Mandats de vente
mandat_proprietaires    -- Liaison mandats ↔ contacts (propriétaires)
```

#### CONTACTS
```sql
contacts                -- CRM — tous types de contacts
contact_roles           -- Rôles d'un contact (multi-rôles)
contact_biens           -- Liaison contacts ↔ biens
contact_interactions    -- Historique interactions
contact_rappels         -- Rappels associés aux contacts
contact_alertes_biens   -- Critères de recherche prospects
```

#### PASS'ADRESSES
```sql
pass_adresses           -- Demandes BIA
pass_templates          -- Templates de questionnaire
pass_relances           -- Relances automatiques
```

#### POOLS
```sql
pools                   -- Pools de collaboration
pool_membres            -- Membres d'un pool
pool_biens              -- Biens partagés dans un pool
pool_acces_prives       -- Demandes d'accès aux infos privées
pool_invitations        -- Invitations (membres non inscrits)
```

#### DOCUMENTS
```sql
documents               -- Fichiers Immo Cloud
documents_requis        -- Liste dynamique docs nécessaires
documents_acces         -- Traçabilité des accès
```

#### ABONNEMENTS & CRÉDITS
```sql
abonnements             -- Abonnements Stripe
abonnements_quotas      -- Quotas par plan
abonnements_usage       -- Consommation mensuelle
factures                -- Factures générées
credits                 -- Mouvements de crédits
credits_packs           -- Packs achetables
parrainages             -- Système de parrainage
```

#### NOTIFICATIONS & ALERTES
```sql
notifications           -- Toutes les notifications
alertes_biens           -- Alertes biens personnalisées
```

#### STATISTIQUES
```sql
stats_utilisateurs      -- Stats mensuelles par user
stats_pools             -- Stats mensuelles par pool
```

#### SYSTÈME
```sql
nouveautes              -- Journal des mises à jour
support_tickets         -- Tickets support
support_messages        -- Messages des tickets
page_statut             -- Statut des services
```

### 17.2 Principes d'architecture BDD

- **Soft delete** : champ `deleted_at` sur toutes les tables principales (jamais de suppression réelle)
- **Horodatage** : `created_at` + `updated_at` sur toutes les tables
- **Évolutivité** : champ `metadata JSONB` sur toutes les tables principales
- **Migrations versionnées** : fichiers numérotés, jamais de modification directe en prod
- **PostGIS** : extension PostgreSQL pour les requêtes géographiques (rayons km)

---

## 18. Plan de développement

### 18.1 Setup initial (Jour 1)

```
Matin
├── Créer repo GitHub + branches (main/staging/develop)
├── Créer 2 projets Supabase (staging + prod)
├── Connecter Vercel aux branches
└── Configurer variables d'environnement

Après-midi
├── Initialiser projet Next.js 14
├── Configurer shadcn/ui + Tailwind CSS
├── Première migration BDD (tables users + agences)
└── Page de connexion fonctionnelle déployée
```

### 18.2 MVP Pass'Adresses (Semaines 1-2)

```
Semaine 1
├── Auth complète (inscription, connexion, reset mdp)
├── Profil utilisateur + agence
├── Gestion des biens (champs minimum MVP)
├── Mandats (champs minimum MVP)
└── Import via URL n8n

Semaine 2
├── Pass'Adresses core
│   ├── Création demande + template
│   ├── Magic link + questionnaire prospect
│   ├── OTP SMS Twilio
│   ├── Scoring automatique
│   ├── Génération BIA PDF
│   └── Workflow acceptation/refus/complément
├── Relances automatiques
├── Mini landing page du bien
└── QR Code par bien
```

### 18.3 Brikii Pool (Semaine 3)

```
├── CRUD pools
├── Gestion membres + invitations
├── Charte PDF auto-générée
├── Partage des biens
├── Accès infos privées + signature
└── Intégration pools.immo
```

### 18.4 Immo Cloud (Semaine 4)

```
├── Upload multiple documents
├── Gestion niveaux d'accès
├── Liste documents requis dynamique
├── Partage via lien sécurisé
└── Traçabilité accès
```

### 18.5 Abonnements & crédits (Semaine 4-5)

```
├── Intégration Stripe complète
├── Gestion quotas en temps réel
├── Système de crédits
├── Parrainage
├── Packs de crédits
└── Factures
```

### 18.6 Finalisation (Semaine 5)

```
├── Notifications in-app complètes
├── Alertes biens
├── Statistiques utilisateur + pool
├── Back-office admin
├── Emails transactionnels tous modules
├── Monitoring Sentry + UptimeRobot
├── Documentation du code (README complet)
└── Tests + déploiement production
```

### 18.7 Post-lancement

```
V2 (selon retours utilisateurs)
├── Reconnaissance IA documents
├── Suivi validité diagnostics
├── Notifications push mobile
├── Export CSV/PDF données
├── Widget Pass'Adresses intégrable
├── Intégration portails immobiliers
└── API publique (plan Réseau)
```

---

## 19. Sécurité

### 19.1 Row Level Security (RLS) — Supabase

RLS activé sur **toutes les tables sans exception**. Chaque utilisateur ne peut accéder qu'à ses propres données.

```sql
-- Exemple : un utilisateur ne voit que ses biens
CREATE POLICY "users_own_biens" ON biens
  FOR ALL USING (auth.uid() = user_id);

-- Un membre de pool actif voit les biens du pool
CREATE POLICY "pool_members_see_biens" ON pool_biens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pool_membres
      WHERE pool_id = pool_biens.pool_id
        AND user_id = auth.uid()
        AND statut = 'actif'
        AND charte_acceptee = true
    )
  );

-- L'adresse exacte n'est accessible qu'au propriétaire du mandat
CREATE POLICY "only_owner_sees_address" ON biens_adresses_privees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM biens
      WHERE id = biens_adresses_privees.bien_id
        AND user_id = auth.uid()
    )
  );
```

**Politique RLS par table :**

| Table | Lecture | Écriture | Suppression |
|-------|---------|----------|-------------|
| `users` | Soi-même | Soi-même | Admin |
| `biens` | Propriétaire + membres pool | Propriétaire | Propriétaire (soft) |
| `pass_adresses` | Propriétaire | Propriétaire | Propriétaire (soft) |
| `pools` | Membres actifs + public (ouvert) | Admin pool | Admin pool (soft) |
| `pool_biens` | Membres actifs | Admin pool + proprio bien | Admin pool |
| `documents` | Selon niveau accès | Propriétaire | Propriétaire (soft) |
| `contacts` | Propriétaire | Propriétaire | Propriétaire (soft) |
| `mandats` | Propriétaire | Propriétaire | Propriétaire (soft) |
| `notifications` | Destinataire | Système | Destinataire |
| `factures` | Propriétaire | Système (Stripe webhook) | Jamais |
| `audit_logs` | Admin Brikii | Système | Jamais |

### 19.2 Chiffrement des données sensibles

**Chiffrement au repos :** géré automatiquement par Supabase (AES-256).

**Chiffrement supplémentaire côté application :**

```typescript
// Données chiffrées avant insertion en base
const sensibleFields = [
  'adresse_exacte',        // adresse des biens
  'prospect_telephone',    // téléphone prospects
  'sms_code',             // stocké en hash bcrypt uniquement
  'mot_de_passe_docs',    // hash bcrypt
  'magic_token',          // hash SHA-256
  'piece_identite_url',   // URL signée temporaire
]

// Exemple : hash du code OTP (jamais en clair)
const hashedOTP = await bcrypt.hash(otpCode, 12)
// Vérification : bcrypt.compare(inputCode, hashedOTP)
```

**Séparation des données sensibles :**

```sql
-- L'adresse exacte du bien est isolée
-- avec RLS ultra-strict
biens_adresses_privees (
  id              UUID PRIMARY KEY
  bien_id         UUID → biens
  adresse_exacte  TEXT    -- chiffrée AES-256
  acces_log       JSONB   -- qui a accédé, quand, depuis où
)
```

### 19.3 Authentification renforcée

**Politique de mots de passe :**
```
Longueur minimum : 12 caractères
Obligatoire : 1 majuscule + 1 chiffre + 1 caractère spécial
Blocage : après 5 tentatives échouées
Déblocage : par email uniquement
Expiration : aucune (mais encouragée tous les 12 mois)
Historique : 5 derniers mots de passe non réutilisables
```

**Sessions :**
```
JWT expiration : 24 heures
Refresh token : 30 jours
Révocation : immédiate (déconnexion forcée possible)
Nouveaux appareils : email d'alerte automatique
                     (IP + localisation + appareil)
```

**2FA (Double authentification) — V2 :**
```
Option 2FA par SMS ou application TOTP (Google Authenticator...)
Obligatoire : rôle admin_brikii
Optionnel : tous les utilisateurs
```

### 19.4 Rate limiting

Limites appliquées sur tous les endpoints critiques :

| Endpoint | Limite | Fenêtre |
|----------|--------|---------|
| Login | 5 tentatives | 15 min / IP |
| Reset password | 3 demandes | 1 heure / email |
| OTP SMS | 3 tentatives | 10 min / téléphone |
| Création BIA | 10 | 1 heure / utilisateur |
| Scraping URL n8n | 20 | 1 heure / utilisateur |
| Upload fichiers | 50 | 1 heure / utilisateur |
| API globale | 1 000 req | 1 heure / utilisateur |
| API globale (Réseau) | 10 000 req | 1 heure / utilisateur |

Implémentation via **Upstash Redis** (rate limiting distribué, compatible Vercel Edge).

### 19.5 Sécurité des tokens et liens

```
Magic links Pass'Adresses :
  → UUID v4 aléatoire (128 bits d'entropie)
  → Stocké en hash SHA-256 (jamais en clair)
  → Expiration 48h
  → Usage unique — invalidé immédiatement après soumission

Invitations pool :
  → UUID v4
  → Expiration 7 jours
  → Usage unique

Liens partage documents :
  → UUID v4
  → Expiration configurable (défaut 7 jours)
  → Révocables à tout moment par le propriétaire

Tokens reset password :
  → UUID v4
  → Expiration 1 heure
  → Usage unique
```

### 19.6 Sécurité des APIs

**Validation stricte des entrées avec Zod :**

```typescript
import { z } from 'zod'

const createPassAdresseSchema = z.object({
  bien_id: z.string().uuid(),
  contact_id: z.string().uuid(),
  template_id: z.string().uuid().optional(),
  doc_identite_demande: z.boolean(),
  doc_identite_obligatoire: z.boolean(),
  signature_manuscrite: z.boolean(),
  criteres_recherche: z.boolean(),
  verification_sms: z.boolean().default(true),
})

// Jamais de données brutes insérées en BDD
// Sanitisation systématique avant tout traitement
```

**Protection contre les attaques courantes :**

| Attaque | Protection |
|---------|-----------|
| SQL Injection | Requêtes paramétrées Supabase (natif) |
| XSS | Échappement React + Content Security Policy |
| CSRF | Tokens CSRF sur tous les formulaires |
| IDOR | RLS Supabase + vérification ownership API |
| Path Traversal | Validation stricte noms de fichiers uploadés |
| Clickjacking | Header X-Frame-Options: SAMEORIGIN |
| MITM | HSTS + HTTPS obligatoire |

**Headers de sécurité HTTP :**

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "img-src 'self' images.brikii.fr data:",
      "connect-src 'self' *.supabase.co api.mapbox.com",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  }
]
```

### 19.7 Sécurité des fichiers uploadés

```typescript
const ALLOWED_MIME_TYPES = {
  documents: ['application/pdf', 'image/jpeg', 'image/png'],
  photos:    ['image/jpeg', 'image/png', 'image/webp'],
  signatures: ['image/png'],
  identite:  ['image/jpeg', 'image/png', 'application/pdf'],
}

const MAX_FILE_SIZES = {
  documents:  10 * 1024 * 1024,  // 10 Mo
  photos:      5 * 1024 * 1024,  // 5 Mo
  signatures:    500 * 1024,      // 500 Ko
  identite:    5 * 1024 * 1024,  // 5 Mo
}

// Contrôles systématiques :
// 1. Vérification type MIME réel (pas seulement extension)
// 2. Vérification taille avant upload
// 3. Renommage systématique → UUID + extension validée
// 4. Jamais conserver le nom de fichier original
// 5. Scan antivirus sur les PDFs (ClamAV ou service tiers)
```

**Accès aux fichiers :**
```
Documents privés (Supabase Storage) :
  → URLs signées avec expiration (1h par défaut)
  → Jamais d'URL publique permanente
  → Chaque accès loggé dans documents_acces

Photos biens (Cloudflare Images) :
  → URLs publiques pour les photos de biens (non sensible)
  → URLs signées pour les pièces d'identité prospects
```

### 19.8 Sécurité infrastructure

**Supabase :**
```
Service role key → jamais exposée côté client
Anon key        → accès minimal (RLS obligatoire)
SSL enforced    → toutes les connexions BDD
IP allowlist    → restreindre accès BDD à Vercel uniquement
Connection pool → PgBouncer activé
```

**Secrets et variables d'environnement :**
```
Règle absolue : zéro secret dans le code source
→ GitHub Secrets pour CI/CD
→ Vercel Environment Variables pour le runtime
→ Fichiers .env jamais commités (.gitignore strict)
→ Rotation des clés API tous les 6 mois
→ Clés différentes par environnement (dev/staging/prod)
```

### 19.9 Audit logs

Toutes les actions sensibles sont tracées dans la table `audit_logs` :

```sql
audit_logs (
  id            UUID PRIMARY KEY
  user_id       UUID → users          -- qui
  action        VARCHAR(100)          -- quoi
  table_name    VARCHAR(100)          -- sur quelle table
  record_id     UUID                  -- quel enregistrement
  old_values    JSONB                 -- état avant
  new_values    JSONB                 -- état après
  ip_address    INET                  -- depuis quelle IP
  user_agent    TEXT                  -- depuis quel appareil
  created_at    TIMESTAMPTZ DEFAULT now()
)
```

**Actions auditées systématiquement :**

| Catégorie | Actions |
|-----------|---------|
| Auth | Connexion, déconnexion, reset mdp, nouvel appareil |
| Données sensibles | Accès adresse exacte, accès document privé |
| Pass'Adresses | Génération BIA, acceptation, refus |
| Mandats | Création, modification, suppression |
| Pools | Création pool, exclusion membre, modification charte |
| Abonnements | Changement plan, attribution crédits |
| Admin | Toutes les actions back-office sans exception |

### 19.10 Plan de réponse aux incidents

**Niveaux de gravité :**

| Niveau | Description | Délai réponse | Communication |
|--------|-------------|---------------|---------------|
| P1 — Critique | Données exposées, panne totale | < 1h | < 2h |
| P2 — Majeur | Fonctionnalité principale indisponible | < 4h | < 6h |
| P3 — Mineur | Bug, lenteur, dysfonctionnement partiel | < 24h | À la résolution |

**Checklist incident de sécurité P1 :**
```
□ 1. Identifier le périmètre exact de l'incident
□ 2. Isoler les systèmes compromis
□ 3. Révoquer tous les tokens et sessions actives
□ 4. Analyser les audit_logs pour comprendre l'étendue
□ 5. Corriger la faille
□ 6. Vérifier qu'aucune porte dérobée ne subsiste
□ 7. Communiquer aux utilisateurs concernés (transparence)
□ 8. Notifier la CNIL si données personnelles exposées
     (obligation légale : 72h maximum)
□ 9. Post-mortem documenté et partagé en interne
```

---

## 20. Conformité RGPD

### 20.1 Responsable du traitement

**Brikii** (éditeur de la plateforme) est responsable du traitement des données personnelles collectées via l'application.

Brikii agit en qualité de **prestataire de services informatiques** — outil de mise en contact — et non comme partie prenante aux transactions immobilières.

### 20.2 Bases légales des traitements

| Traitement | Base légale |
|------------|-------------|
| Gestion du compte utilisateur | Exécution du contrat |
| Facturation et abonnements | Exécution du contrat + obligation légale |
| Envoi d'emails transactionnels | Exécution du contrat |
| Génération du BIA | Exécution du contrat + intérêt légitime |
| Collecte données prospects (Pass'Adresses) | Intérêt légitime du professionnel |
| Audit logs de sécurité | Intérêt légitime (sécurité) |
| Statistiques d'usage | Intérêt légitime (amélioration service) |
| Emails marketing / nouveautés | Consentement (opt-in) |

### 20.3 Durées de conservation

| Donnée | Durée | Base légale |
|--------|-------|-------------|
| Données compte utilisateur actif | Durée abonnement + 3 ans | Contrat |
| Données compte utilisateur inactif | 3 ans après dernière connexion | Intérêt légitime |
| BIA et dossiers de preuve | 5 ans | Obligation légale (preuve) |
| Données prospects Pass'Adresses | 3 ans sans interaction | Intérêt légitime |
| Logs de connexion et audit | 1 an | Sécurité |
| Factures et données comptables | 10 ans | Obligation légale (comptabilité) |
| Données de paiement Stripe | Gérées par Stripe | Délégation |
| Cookies et traceurs | 13 mois maximum | CNIL |

### 20.4 Droits des utilisateurs

Tous les droits RGPD sont accessibles depuis "Mon compte" :

| Droit | Implémentation |
|-------|---------------|
| **Accès** | Export complet des données en JSON/CSV en 1 clic |
| **Rectification** | Modification profil et données à tout moment |
| **Effacement** | Suppression compte (anonymisation + soft delete) |
| **Portabilité** | Export au format standard JSON |
| **Opposition** | Opt-out emails marketing depuis les préférences |
| **Limitation** | Gel du traitement sur demande (support) |

**Processus d'anonymisation à la suppression du compte :**

```sql
-- On n'efface pas physiquement (obligations légales BIA)
-- On anonymise toutes les données personnelles
UPDATE users SET
  email        = 'deleted_' || id || '@deleted.brikii.fr',
  prenom       = 'Utilisateur',
  nom          = 'Supprimé',
  telephone    = NULL,
  adresse      = NULL,
  photo_url    = NULL,
  metadata     = '{}',
  deleted_at   = now()
WHERE id = [user_id];

-- Les BIA restent (obligation légale 5 ans)
-- mais les données prospect sont anonymisées séparément
```

### 20.5 Sous-traitants et DPA

Tous les sous-traitants traitant des données personnelles doivent avoir signé un **Data Processing Agreement (DPA)** :

| Sous-traitant | Pays | Données traitées | DPA |
|---------------|------|-----------------|-----|
| Supabase | USA (hébergement EU disponible) | Toutes les données | ✅ À signer |
| Vercel | USA | Logs, requêtes | ✅ À signer |
| Cloudflare | USA | Photos, images | ✅ À signer |
| Resend | USA | Emails + contenu | ✅ À signer |
| Twilio | USA | N° téléphone + SMS | ✅ À signer |
| Stripe | USA | Données paiement | ✅ Disponible |
| Mapbox | USA | Coordonnées GPS | ✅ À signer |
| Sentry | USA | Logs d'erreurs | ✅ À signer |

> ⚠️ **Action requise :** Configurer Supabase pour héberger les données en Europe (région `eu-west-1` — Frankfurt) afin de limiter les transferts hors UE.

### 20.6 Registre des traitements

Document obligatoire (Article 30 RGPD) — à maintenir à jour :

```
Traitement 1 : Gestion des comptes utilisateurs
  Finalité       : Fourniture du service Brikii
  Personnes      : Professionnels immobilier
  Données        : Identité, coordonnées, infos pro
  Destinataires  : Brikii (interne), Supabase
  Conservation   : Durée abonnement + 3 ans
  Base légale    : Exécution du contrat

Traitement 2 : Pass'Adresses — qualification prospects
  Finalité       : Génération de BIA pour l'agent
  Personnes      : Prospects acquéreurs
  Données        : Identité, téléphone, email, adresse,
                   critères recherche, pièce identité
  Destinataires  : Agent immobilier, Brikii, Twilio (SMS)
  Conservation   : 3 ans sans interaction / 5 ans (BIA)
  Base légale    : Intérêt légitime professionnel

Traitement 3 : Facturation
  Finalité       : Gestion des abonnements et paiements
  Personnes      : Utilisateurs abonnés
  Données        : Identité, coordonnées, données paiement
  Destinataires  : Brikii, Stripe
  Conservation   : 10 ans
  Base légale    : Obligation légale + contrat

[... à compléter pour chaque traitement]
```

### 20.7 Politique de cookies

**Cookies strictement nécessaires (pas de consentement requis) :**
- Session d'authentification (Supabase JWT)
- Préférences interface (thème, langue)
- Sécurité CSRF

**Cookies analytiques (consentement requis) :**
- Aucun cookie analytics tiers prévu (conformité renforcée)
- Statistiques d'usage : données anonymisées côté serveur uniquement

**Pas de cookies publicitaires — jamais.**

### 20.8 Mentions légales et documents obligatoires

Documents à finaliser avant le lancement :

- [ ] **Mentions légales** — éditeur, hébergeur, contact
- [ ] **CGU** (Conditions Générales d'Utilisation) — déjà rédigées
- [ ] **CGV** (Conditions Générales de Vente) — déjà rédigées
- [ ] **Politique de confidentialité** — déjà rédigée
- [ ] **Politique de cookies** — à rédiger
- [ ] **Registre des traitements** — à compléter
- [ ] **DPA sous-traitants** — à signer pour chaque service

### 20.9 Contact DPO

Brikii doit désigner un point de contact RGPD accessible depuis l'application et les emails :

```
Email RGPD : privacy@brikii.fr
Formulaire : brikii.fr/rgpd
Délai de réponse garanti : 30 jours maximum (obligation légale)
```

---

## Annexes

### A. Charte graphique

| Élément | Valeur |
|---------|--------|
| Couleur principale | `#F5C842` (jaune Brikii) |
| Fond sombre | `#1a1a1a` |
| Texte principal | `#1a1a1a` |
| Texte secondaire | `#73726c` |
| Succès | `#3B6D11` / `#EAF3DE` |
| Danger | `#A32D2D` / `#FCEBEB` |
| Info | `#185FA5` / `#E6F1FB` |
| Police | System font / Anthropic Sans |
| Border radius card | `12px` |
| Border width | `0.5px` |

### B. Documents à fournir

- [ ] Template Word du BIA avec variables
- [ ] CGU Brikii
- [ ] CGV Brikii
- [ ] Politique de confidentialité

### C. Comptes à créer / configurer

- [ ] Supabase (2 projets : staging + prod)
- [ ] Vercel
- [ ] Cloudflare Images
- [ ] Resend
- [ ] Twilio
- [ ] Stripe (compte existant à configurer)
- [ ] Mapbox
- [ ] Sentry
- [ ] UptimeRobot
- [ ] GitHub

---

*Document généré le 17 avril 2026*
*Version 1.1 — Mise à jour : ajout sections Sécurité (19) et Conformité RGPD (20)*
*À mettre à jour au fil du développement*
