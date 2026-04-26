# Biens immobiliers — Spécification

> **Statut :** MVP V1 — implémenté  
> **Version :** 1.0  
> **Priorité roadmap :** MVP V1  
> **Dépendances :** Aucune (brique centrale)

---

## Rôle dans Brikii

La gestion des biens est la **brique centrale** de Brikii — la plupart des autres briques (Mandats, Pass'Adresses, ImmoCloud, Pool) gravitent autour d'un bien immobilier.

---

## État actuel (implémenté)

- CRUD complet : création, édition, suppression (soft delete)
- Import depuis URL via n8n (scraping)
- Upload photos via Cloudflare Images
- Statuts : `brouillon | sur_le_marche | sous_offre | vendu | archive`
- Cascade : archivage bien → archivage des mandats actifs
- Adresse avec autocomplétion (API Adresse gouv.fr)

---

## Règles métier

### Statuts et transitions

```
brouillon ──→ sur_le_marche ──→ sous_offre ──→ vendu
                                              ↓
                                           archive
```

- Archiver un bien cascade les mandats actifs (`statut_metier → 'archive'`)
- Un mandat ne peut pas être activé si son bien est archivé ou supprimé

### Types de biens et tables détail

| Type | Table détail |
|------|-------------|
| `maison` | `biens_maisons` |
| `appartement` | `biens_appartements` |
| `terrain` | `biens_terrains` |
| `immeuble` | `biens_immeubles` |
| `commerce` | `biens_commerces` |
| `local` | `biens_locaux_pro` |
| `propriete` | `biens_proprietes` |

---

## Évolutions fonctionnelles à documenter

> Section à enrichir progressivement.

- [ ] Vue carte géographique (Mapbox)
- [ ] Alertes biens (critères prospect)
- [ ] Comportement lors de la mise en pool (visibilité, adresse masquée)

---

*Dernière mise à jour : 2026-04-26*
