## ADDED Requirements

### Requirement: Afficher la liste des biens de l'agent connecté
Le système SHALL afficher sur `/biens` la liste paginée (max 50) des biens appartenant à l'utilisateur authentifié, triée par `created_at` décroissant. Seuls les biens non supprimés (`deleted_at IS NULL`) sont affichés.

#### Scenario: Liste avec biens existants
- **WHEN** un agent authentifié accède à `/biens`
- **THEN** le système affiche les biens de l'agent avec pour chaque bien : type, adresse (ville + code postal), prix formaté en euros, statut sous forme de badge coloré

#### Scenario: Liste vide
- **WHEN** un agent authentifié accède à `/biens` et n'a aucun bien
- **THEN** le système affiche un état vide avec un message explicatif et un bouton "Ajouter un bien"

#### Scenario: Accès non authentifié
- **WHEN** un utilisateur non connecté accède à `/biens`
- **THEN** le proxy redirige vers `/login?redirect=/biens`

### Requirement: Accéder à la création depuis la liste
Le système SHALL afficher sur la page liste un bouton "Ajouter un bien" qui navigue vers `/biens/nouveau`.

#### Scenario: Navigation vers le formulaire
- **WHEN** l'agent clique sur "Ajouter un bien"
- **THEN** le système navigue vers `/biens/nouveau`
