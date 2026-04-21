## ADDED Requirements

### Requirement: Création de demande d'agence
L'endpoint POST `/api/agences/request` SHALL créer une ligne dans `agences_demandes` avec les informations fournies (siret, nom, ville, contact) et MUST envoyer un email de notification à l'admin Brikii via Resend.

#### Scenario: Demande créée avec succès
- **WHEN** l'utilisateur soumet une demande avec un SIRET valide et un nom
- **THEN** une ligne est insérée dans `agences_demandes`, un email est envoyé à l'admin, et l'API retourne `{ success: true, id: uuid }`

#### Scenario: Demande dupliquée (même SIRET)
- **WHEN** une demande existe déjà pour ce SIRET avec statut `pending`
- **THEN** l'API retourne HTTP 409 avec `{ error: 'demande_existante', id: uuid_existant }`

#### Scenario: Rate limit demande
- **WHEN** une IP envoie plus de 5 requêtes par minute vers cet endpoint
- **THEN** l'API retourne HTTP 429

### Requirement: Schéma table agences_demandes
La table `agences_demandes` SHALL contenir : id, siret, nom, ville, contact_email, contact_nom, statut (pending/approuve/refuse), demande_par (FK profiles), traite_par (FK profiles nullable), notes_admin, metadata, created_at, updated_at.

#### Scenario: Insertion valide
- **WHEN** toutes les colonnes obligatoires sont fournies
- **THEN** la ligne est insérée avec statut `pending` et timestamps auto

#### Scenario: RLS — visibilité propre
- **WHEN** un utilisateur authentifié consulte ses demandes
- **THEN** il voit uniquement les lignes où `demande_par = auth.uid()`
