# Contacts (CRM) — Spécification

> **Statut :** Spécification initiale (PRD)  
> **Version :** draft  
> **Priorité roadmap :** MVP V1  
> **Dépendances :** Biens (pour les alertes), Pass'Adresses (import automatique)

---

## Rôle dans Brikii

Le Carnet d'adresses est le **CRM immobilier** de Brikii. Il centralise tous les contacts gravitant autour des biens et des transactions : propriétaires, acquéreurs, prospects, mais aussi diagnostiqueurs, notaires, artisans, etc.

---

## Règles métier

### Types de contacts

**Particuliers :** propriétaire_vendeur, propriétaire_bailleur, locataire, acquéreur, prospect_acquéreur, prospect_vendeur

**Professionnels immobilier :** agent_immobilier, mandataire, négociateur, notaire, gestionnaire

**Professionnels techniques :** diagnostiqueur, géomètre, architecte, artisan, expert_immobilier

**Juridique / Financier :** avocat, huissier, banquier, courtier_crédit, assureur, comptable

### Règles clés

- Un contact peut avoir **plusieurs rôles simultanément**
- Déduplication automatique par email ou téléphone (alerte si doublon détecté)
- Import automatique depuis Pass'Adresses (prospects qualifiés)

---

## Évolutions fonctionnelles à documenter

> Section à enrichir progressivement.

- [ ] Tags libres personnalisables
- [ ] Historique des interactions (appel, email, visite, note)
- [ ] Critères de recherche prospect pour alertes biens
- [ ] Rappels associés à un contact

---

*Dernière mise à jour : 2026-04-26*
