# Documentation produit Brikii

Ce répertoire contient les **spécifications détaillées par brique fonctionnelle**.

Chaque fichier dans `briques/` est la source de vérité métier pour la brique concernée.
Le `PRD.md` à la racine du projet reste le document de vision globale — il référence ces specs.

## Briques

| Brique | Fichier | Statut | Priorité |
|--------|---------|--------|----------|
| Biens immobiliers | [briques/biens.md](briques/biens.md) | Implémenté | MVP V1 |
| Mandats | [briques/mandats.md](briques/mandats.md) | Implémenté | MVP V1 |
| Pass'Adresses | [briques/pass-adresses.md](briques/pass-adresses.md) | En cours | MVP V1 |
| Contacts (CRM) | [briques/contacts.md](briques/contacts.md) | Spécification | MVP V1 |
| ImmoCloud | [briques/immo-cloud.md](briques/immo-cloud.md) | Spécification | V2 |
| Brikii Pool | [briques/brikii-pool.md](briques/brikii-pool.md) | Spécification | V2 |

## Principes

- **Non-destructif** — aucune modification de BDD sans migration numérotée
- **Modulaire** — chaque brique évolue indépendamment
- **Extensible** — champ `metadata JSONB` sur toutes les tables principales
- **Soft delete** — champ `deleted_at` sur toutes les tables, jamais de suppression physique
