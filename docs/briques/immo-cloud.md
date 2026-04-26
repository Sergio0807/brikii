# ImmoCloud — Spécification fonctionnelle

## 1. Vision

ImmoCloud est la brique documentaire de Brikii.

Son objectif est de permettre la constitution progressive et intelligente d'un dossier de vente immobilier complet, structuré et exploitable immédiatement par un notaire ou un tiers.

ImmoCloud n'est pas un simple stockage de fichiers : c'est un système de gestion documentaire orienté transaction.

---

## 2. Objectifs

* Centraliser tous les documents liés à un bien
* Structurer les documents selon leur rôle juridique
* Suivre la complétude d'un dossier de vente
* Identifier les documents manquants
* Préparer un dossier prêt pour le notaire
* Permettre le partage sécurisé avec des tiers

---

## 3. Gestion des documents

Chaque document doit :

* être rattaché à un bien
* pouvoir être typé (ex : mandat, taxe foncière, diagnostic, titre de propriété, etc.)
* être stocké de manière sécurisée
* être associé à un statut :

  * manquant
  * demandé
  * reçu
  * validé
  * à vérifier

---

## 4. Dossier de vente

Chaque bien possède un dossier documentaire structuré.

Ce dossier doit :

* regrouper tous les documents liés à la transaction
* être lisible et exploitable par un notaire
* pouvoir être partagé ou exporté facilement

---

## 5. Complétude du dossier

Le système doit calculer un niveau de complétude.

Objectifs :

* afficher une jauge de progression
* identifier clairement les documents manquants
* guider l'utilisateur dans la constitution du dossier

---

## 6. Niveaux d'accès aux documents

Chaque document peut avoir un niveau d'accès :

* privé (visible uniquement par le détenteur)
* intercabinet (visible après autorisation)
* public (visible par tous les membres autorisés)

Ces niveaux seront utilisés notamment dans Brikii Pool.

---

## 7. Partage externe

Le système doit permettre :

* la génération d'un lien sécurisé
* l'accès à un dossier complet sans création de compte
* une traçabilité des accès

Cas d'usage :

* notaire
* acquéreur
* partenaire professionnel

---

## 8. Évolutions prévues

### 8.1 Documents requis intelligents

À terme, le système devra être capable de :

* déterminer automatiquement les documents nécessaires
* en fonction du contexte du bien :

  * type de bien
  * statut du vendeur
  * situation juridique
  * caractéristiques techniques

---

### 8.2 Intégration RAG

Un système RAG pourra être utilisé pour :

* enrichir les règles documentaires
* analyser les documents déposés
* identifier leur nature
* détecter les incohérences

---

### 8.3 Analyse automatique

Chaque document pourra être analysé pour :

* extraire des informations
* vérifier la cohérence
* détecter des éléments juridiques importants

---

## 9. Contraintes

* Ne pas modifier la base de données existante sans instruction
* Utiliser des migrations propres le moment venu
* Lier les documents aux biens, mandats et transactions
* Prévoir une architecture extensible

---

## 10. Positionnement

ImmoCloud est une brique transverse utilisée par :

* Pass'Adresses (documents liés aux biens)
* Brikii Pool (partage de documents)
* Dossiers de vente

---

## 11. Philosophie

ImmoCloud doit évoluer vers un système où :

* le dossier est structuré automatiquement
* la complétude est visible en temps réel
* la préparation de la vente est fluide
* le notaire reçoit un dossier directement exploitable

Ce document est évolutif et sera enrichi progressivement.
