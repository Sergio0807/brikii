# Documentation produit Brikii

Ce répertoire contient les spécifications organisées en deux niveaux distincts.

---

## Briques fonctionnelles — `/docs/briques/`

Modules commercialisables et différenciants. Chaque brique apporte une valeur ajoutée autonome et peut être vendue/activée indépendamment.

| Brique | Fichier | Statut | Priorité |
|--------|---------|--------|----------|
| **Pass'Adresses** | [briques/pass-adresses.md](briques/pass-adresses.md) | En cours | MVP V1 |
| **ImmoCloud** | [briques/immo-cloud.md](briques/immo-cloud.md) | Spécification | V2 |
| **Brikii Pool** | [briques/brikii-pool.md](briques/brikii-pool.md) | Spécification | V2 |

---

## Socle métier — `/docs/socle/`

Entités fondamentales du cœur applicatif. Elles ne sont pas commercialisées seules mais sont nécessaires au fonctionnement de toutes les briques.

| Entité | Fichier | Statut | Priorité |
|--------|---------|--------|----------|
| **Biens** | [socle/biens.md](socle/biens.md) | Implémenté | MVP V1 |
| **Mandats** | [socle/mandats.md](socle/mandats.md) | Implémenté | MVP V1 |
| **Contacts** | [socle/contacts.md](socle/contacts.md) | Spécification | MVP V1 |
| **Transactions** | [socle/transactions.md](socle/transactions.md) | À définir | V2 |

---

## Principes

- **Non-destructif** — aucune modification de BDD sans migration numérotée
- **Modulaire** — chaque brique évolue indépendamment du socle
- **Extensible** — champ `metadata JSONB` sur toutes les tables principales
- **Soft delete** — champ `deleted_at` sur toutes les tables, jamais de suppression physique
