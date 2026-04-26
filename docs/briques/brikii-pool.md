# Brikii Pool — Spécification fonctionnelle

## 1. Vision

Brikii Pool est la brique de collaboration interprofessionnelle de Brikii.

Son objectif est de permettre aux professionnels de l'immobilier (agents, mandataires, réseaux) de partager leurs biens à la vente dans un cadre structuré, sécurisé et traçable, tout en conservant la maîtrise de leurs informations et de leurs conditions de collaboration.

Brikii Pool vise à casser les silos entre réseaux et à fluidifier les transactions immobilières.

---

## 2. Objectifs

* Permettre le partage de biens entre professionnels
* Augmenter la visibilité des biens à la vente
* Faciliter la collaboration inter-cabinets
* Encadrer les règles de rétrocession
* Protéger les informations sensibles (adresse, documents)
* Assurer la traçabilité des accès aux informations
* Générer des opportunités de vente supplémentaires

---

## 3. Fonctionnement général

### 3.1 Définition d'un Pool

Un Pool est un espace de partage regroupant plusieurs professionnels autour d'un secteur géographique ou d'un réseau.

Chaque Pool contient :

* des biens partagés
* des membres (professionnels)
* des règles de fonctionnement
* éventuellement des règles de rétrocession

---

### 3.2 Types de Pools

* Pool ouvert :

  * accessible librement aux professionnels
  * chaque membre peut inviter d'autres membres

* Pool fermé :

  * accès sur invitation ou validation
  * gestion par un administrateur

---

### 3.3 Partage des biens

* Chaque membre du Pool peut déposer ses propres biens

* Un bien ne peut être déposé que par le professionnel détenteur du mandat

* Le déposant conserve le contrôle :

  * des informations visibles
  * des conditions de collaboration
  * des règles de rétrocession

* Le bien devient visible par les membres du Pool, selon les règles d'accès définies

---

## 4. Gestion des accès

### 4.1 Informations publiques vs privées

* Informations publiques :

  * caractéristiques du bien
  * photos
  * descriptif

* Informations sensibles (masquées par défaut) :

  * adresse complète du bien
  * documents associés au bien
  * informations confidentielles liées au mandat ou à la transaction

---

### 4.2 Demande et autorisation d'accès

Pour accéder aux informations sensibles, un membre du Pool doit effectuer une demande d'accès.

Le détenteur du mandat peut accepter ou refuser cette demande.

En cas d'acceptation :

* le système génère un accès individuel sécurisé (token nominatif)
* cet accès est strictement lié :

  * au bien concerné
  * au professionnel demandeur
  * à la date d'autorisation
  * à une durée éventuelle de validité

Cet accès doit être :

* traçable (historique des accès)
* révocable à tout moment
* nominatif (non transférable)

---

### 4.3 Traçabilité

Le système doit permettre de :

* savoir qui a accédé à quoi
* savoir quand
* conserver une preuve d'accès
* historiser les demandes et validations

---

## 5. Documents et lien avec ImmoCloud

Brikii Pool s'appuie directement sur ImmoCloud.

* les documents sont stockés dans ImmoCloud
* l'accès aux documents dépend des autorisations
* les niveaux d'accès (privé / intercabinet / public) sont utilisés

---

## 6. Règles de rétrocession

Chaque bien peut être associé à une règle de rétrocession :

* définie par le détenteur du mandat
* exprimée en pourcentage

Le Pool peut également imposer une règle globale :

* ex : 50/50 obligatoire
* cette règle prime sur les règles individuelles

---

## 7. Expérience utilisateur

### 7.1 Côté déposant

* ajout du bien dans un Pool
* définition des conditions de collaboration
* gestion des demandes d'accès

---

### 7.2 Côté membre du Pool

* consultation des biens
* demande d'accès aux informations sensibles
* génération de fiches PDF personnalisées

---

### 7.3 Fiches commerciales

Chaque membre peut générer une fiche :

* avec son propre branding
* avec les informations autorisées
* sans divulguer les données sensibles

---

## 8. Extension publique : pools.immo

### 8.1 Rôle

pools.immo est la vitrine publique des Pools.

Il permet de :

* afficher les biens disponibles (sans données sensibles)
* générer de la visibilité
* attirer des professionnels
* générer des demandes d'accès

---

### 8.2 Fonctionnement

* affichage des biens sur une carte
* consultation libre des données publiques
* bouton "demander l'accès aux informations"
* redirection ou onboarding vers Brikii

---

### 8.3 Objectifs business

* acquisition de nouveaux utilisateurs
* effet réseau
* augmentation du nombre de transactions
* valorisation des biens

---

## 9. Différenciation marché

Brikii Pool se distingue de solutions existantes :

* pas limité aux agences (ouvert aux mandataires)
* pas dépendant d'un réseau fermé
* flexibilité des règles
* traçabilité complète
* intégration native avec ImmoCloud

---

## 10. Évolutions prévues

* gestion des visites (organisation, clés, présence obligatoire)
* notifications d'activité (visites, offres, demandes)
* système d'alertes personnalisées
* scoring des collaborations
* automatisation des demandes d'accès
* intégration avancée avec ImmoCloud

---

## 11. Philosophie

Brikii Pool doit permettre :

* une collaboration simple et sécurisée
* une meilleure diffusion des biens
* une transparence dans les échanges
* une augmentation du taux de vente

Cette brique constitue un élément central du développement réseau de Brikii.
