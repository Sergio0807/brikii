## ADDED Requirements

### Requirement: Index sur colonnes de recherche fréquente
Le système SHALL créer des index B-tree sur les colonnes `user_id`, `statut`, et `pool_id` des tables principales interrogées fréquemment.

#### Scenario: Requête biens par utilisateur
- **WHEN** un utilisateur charge sa liste de biens
- **THEN** la requête utilise `idx_biens_user_id` sans sequential scan

#### Scenario: Requête biens par statut
- **WHEN** l'application filtre les biens `sur_le_marche`
- **THEN** la requête utilise `idx_biens_statut`

### Requirement: Index géographique PostGIS
Le système SHALL créer un index GIST sur la colonne géographique des biens pour les requêtes de rayon en kilomètres.

#### Scenario: Recherche de biens dans un rayon
- **WHEN** une alerte biens calcule les biens dans un rayon de 30km autour d'un code postal
- **THEN** la requête utilise l'index GIST sans sequential scan sur la table `biens`

### Requirement: Index sur tokens et clés de recherche
Le système SHALL créer des index sur `magic_token_hash` (pass_adresses), `stripe_customer_id` (abonnements), et `auth_user_id` (users) pour les lookups fréquents.

#### Scenario: Lookup par magic token
- **WHEN** un prospect soumet son questionnaire via magic link
- **THEN** la recherche du token hashé utilise un index et répond en < 10ms

#### Scenario: Lookup utilisateur par auth_user_id
- **WHEN** le middleware vérifie la session JWT
- **THEN** la recherche du profil utilisateur utilise `idx_users_auth_user_id`
