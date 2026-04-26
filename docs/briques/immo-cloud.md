# ImmoCloud — Spécification

> **Statut :** Spécification en cours  
> **Version :** draft  
> **Priorité roadmap :** V2  
> **Dépendances :** Biens, Mandats, Brikii Pool (pour les niveaux d'accès)

---

## Rôle dans Brikii

ImmoCloud est la brique de **centralisation et gestion documentaire** par bien immobilier.

Elle répond au problème de dispersion des documents : un dossier complet (DDT, titre de propriété, PV AG...) est aujourd'hui éclaté entre email, clé USB, Dropbox, et le logiciel de l'agence. ImmoCloud constitue le dossier numérique de référence du bien, accessible et partageable de façon sécurisée.

---

## Cas d'usage principaux

- **Déposer et organiser** les documents d'un bien (DPE, diagnostics, titre de propriété, etc.)
- **Savoir ce qui manque** via une checklist dynamique selon le type de bien
- **Partager sélectivement** : public (pool), intercabinet (charte signée), ou privé (demande + signature)
- **Tracer les accès** : qui a consulté quel document, quand, depuis quelle IP
- **Partager via lien sécurisé** sans que le destinataire ait besoin d'un compte Brikii

---

## Règles métier

### Niveaux d'accès documents

| Niveau | Qui peut accéder | Condition |
|--------|-----------------|-----------|
| `public` | Tout membre connecté du pool | Être membre actif du pool |
| `intercabinet` | Membres du pool ayant signé la charte | Charte acceptée |
| `prive` | Sur demande + signature électronique | Demande validée par le propriétaire |

> Un document privé dont l'accès a été accordé reste accessible pour la durée définie — pas au-delà.

### Documents requis par type de bien

**Maison / Appartement (commun) :**
- DPE (Diagnostic de Performance Énergétique)
- Diagnostic électricité (obligatoire si installation > 15 ans)
- Diagnostic gaz (obligatoire si installation > 15 ans)
- ERP (État des Risques et Pollutions)
- Titre de propriété
- Taxe foncière (dernier avis)

**Appartement (en plus) :**
- Règlement de copropriété
- 3 derniers PV d'Assemblée Générale
- Fiche synthèse copropriété (loi ALUR)
- Pré-état daté
- Carnet d'entretien de l'immeuble

**Terrain :**
- Certificat d'urbanisme
- Titre de propriété
- ERP

**Immeuble :**
- Titre de propriété
- Diagnostics par lot
- État locatif
- Baux en cours

### Alertes documents manquants

- Lors de la mise sur le marché d'un bien, si des documents obligatoires sont absents → notification à l'agent
- Rappel hebdomadaire tant que des documents critiques manquent

### Validité des diagnostics (V2)

- Suivi automatique des dates d'expiration
- Alerte J-30 avant expiration d'un diagnostic

---

## Architecture et données

### Table principale

```sql
documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  bien_id         UUID NOT NULL REFERENCES biens(id)
  user_id         UUID NOT NULL REFERENCES auth.users(id)
  type            VARCHAR(100)          -- dpe, diagnostic_elec, titre_propriete, pv_ag, etc.
  nom             TEXT NOT NULL         -- nom original du fichier
  url             TEXT NOT NULL         -- chemin Supabase Storage ou URL externe
  taille          INTEGER               -- en octets
  niveau_acces    VARCHAR(20) NOT NULL DEFAULT 'prive'  -- public | intercabinet | prive
  date_expiration DATE                  -- pour les diagnostics avec durée de validité
  metadata        JSONB DEFAULT '{}'
  deleted_at      TIMESTAMPTZ
  created_at      TIMESTAMPTZ DEFAULT now()
  updated_at      TIMESTAMPTZ DEFAULT now()
)
```

### Table traçabilité

```sql
documents_acces (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  document_id     UUID NOT NULL REFERENCES documents(id)
  accessed_by     UUID REFERENCES auth.users(id)  -- null si accès via lien public
  ip_address      INET
  user_agent      TEXT
  methode         VARCHAR(50)   -- 'direct' | 'lien_partage' | 'demande_signee'
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

### Table documents requis (checklist dynamique)

```sql
documents_requis (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  bien_type       VARCHAR(50)   -- maison | appartement | terrain | immeuble | etc.
  type_document   VARCHAR(100)
  label           TEXT
  obligatoire     BOOLEAN DEFAULT true
  conditions      JSONB         -- ex: {"age_installation_min": 15} pour diag elec
)
```

### Bucket Supabase Storage

- **Nom :** `bien-documents`
- **Accès :** privé (toujours via URL signée)
- **Chemin :** `{user_id}/{bien_id}/{document_type}/{filename}`
- **URL signée :** 1 heure par défaut (configurable selon niveau d'accès)

### Liens de partage sécurisés

```sql
documents_liens_partage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  document_id     UUID NOT NULL REFERENCES documents(id)
  token           TEXT NOT NULL UNIQUE   -- UUID v4, stocké en hash SHA-256
  expire_at       TIMESTAMPTZ            -- configurable, défaut 7 jours
  revoque_at      TIMESTAMPTZ
  created_by      UUID REFERENCES auth.users(id)
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

---

## Intégration avec les autres briques

| Brique | Nature de l'intégration |
|--------|------------------------|
| **Biens** | Chaque document est rattaché à un `bien_id` |
| **Mandats** | Un mandat peut pointer vers les documents du bien (lecture seule) |
| **Brikii Pool** | Le niveau d'accès `public` / `intercabinet` est lié à l'appartenance au pool |
| **Pass'Adresses** | À terme : documents consultables par un prospect après validation BIA (V2) |

---

## Périmètre MVP vs V2

| Fonctionnalité | Version |
|----------------|---------|
| Upload multiple simultané | MVP |
| Checklist documents requis dynamique | MVP |
| Alertes documents manquants | MVP |
| Niveaux d'accès (public / intercabinet / privé) | MVP |
| Liens de partage sécurisés (sans compte) | MVP |
| Traçabilité des accès | MVP |
| Reconnaissance IA des documents (type, extraction) | V2 |
| Suivi automatique dates d'expiration diagnostics | V2 |
| Demande d'accès privé avec signature électronique | V2 |

---

## Évolutions fonctionnelles à documenter

> Cette section est destinée à accueillir les règles métier et cas d'usage supplémentaires
> au fil de leur définition.

- [ ] Flux exact de la demande d'accès privé (qui signe quoi, quel PDF généré)
- [ ] Comportement lors de la suppression du bien (cascade sur les documents ?)
- [ ] Quotas de stockage par plan d'abonnement
- [ ] Comportement si le pool est dissous (documents intercabinet → repassent en privé ?)

---

*Dernière mise à jour : 2026-04-26*
