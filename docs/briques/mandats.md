# Mandats — Spécification

> **Statut :** MVP V1 — implémenté  
> **Version :** 1.0  
> **Priorité roadmap :** MVP V1  
> **Dépendances :** Biens

---

## Rôle dans Brikii

La brique Mandats gère le **cycle de vie des mandats de vente** rattachés à un bien. Elle assure le suivi contractuel (durée, expiration, honoraires) et la gestion documentaire du mandat (PDF signé).

---

## État actuel (implémenté)

- CRUD mandats (création, édition, suppression soft delete)
- Rattachement à un bien
- Types : exclusif, simple, semi-exclusif, recherche, gestion
- Statut métier (UI) : En cours / Expiré / Résilié / Vendu / Archivé
- Upload document PDF du mandat (bucket `mandat-documents`)
- Import depuis URL (via n8n) avec workflow `mandat_imports`
- Jauge de durée visuelle (`MandatDureeBar`)
- Cascade : si bien archivé/supprimé → mandats actifs archivés

---

## Règles métier

### Champs statut

| Champ | Rôle | Valeurs |
|-------|------|---------|
| `statut` | Workflow interne (technique) | `brouillon \| import_en_cours \| a_completer \| pret_a_valider \| actif` |
| `statut_metier` | Statut visible dans l'UI | `null (= En cours) \| expire \| resilie \| vendu \| archive` |

> `statut` est interne et ne doit pas être affiché dans l'UI. Le seul statut visible est `statut_metier`.

### Transitions statut_metier

- `null` → "En cours" (état par défaut, mandat actif)
- Toute valeur non-null → mandat clôturé (visible dans "Historique")

### Document du mandat

- Bucket privé `mandat-documents`
- Chemin : `{user_id}/{mandat_id}/{filename}`
- Remplacement atomique via `replace_id`
- URLs signées 1h via GET `/api/mandats/[id]/documents/[docId]`

---

## Évolutions fonctionnelles à documenter

> Section à enrichir progressivement.

- [ ] Alertes expiration J-30, J-15, J-7, J-0
- [ ] Liaison vers contacts propriétaires (`mandat_proprietaires`)
- [ ] Taux de rétrocession pour les pools
- [ ] Renouvellement de mandat (nouveau mandat lié à l'ancien ?)

---

*Dernière mise à jour : 2026-04-26*
