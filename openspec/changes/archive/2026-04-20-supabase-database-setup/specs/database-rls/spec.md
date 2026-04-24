## ADDED Requirements

### Requirement: RLS activé sur toutes les tables sans exception
Le système SHALL activer `ENABLE ROW LEVEL SECURITY` sur chaque table créée. Aucune table ne doit rester sans RLS, y compris les tables système.

#### Scenario: Table sans policy explicite
- **WHEN** RLS est activé sans aucune policy définie
- **THEN** aucun accès n'est possible (deny-by-default)

### Requirement: Policy propriétaire — accès à ses propres données
Pour les tables portant un `user_id`, le système SHALL créer une policy `owner_only` permettant à chaque utilisateur d'accéder uniquement à ses propres enregistrements.

#### Scenario: Utilisateur accède à ses biens
- **WHEN** un utilisateur authentifié interroge la table `biens`
- **THEN** seuls les biens dont `user_id = auth.uid()` sont retournés

#### Scenario: Utilisateur tente d'accéder aux biens d'un autre
- **WHEN** un utilisateur authentifié interroge `biens` avec un filtre sur un autre `user_id`
- **THEN** aucun résultat n'est retourné

### Requirement: Policy pools — membres actifs voient les biens partagés
Le système SHALL créer une policy sur `pool_biens` permettant la lecture aux membres actifs ayant accepté la charte.

#### Scenario: Membre actif avec charte acceptée
- **WHEN** un membre actif (`statut = 'actif'` et `charte_acceptee = true`) interroge `pool_biens`
- **THEN** les biens de son pool sont visibles

#### Scenario: Membre sans charte acceptée
- **WHEN** un membre avec `charte_acceptee = false` interroge `pool_biens`
- **THEN** aucun résultat n'est retourné

### Requirement: Policy audit_logs — lecture admin uniquement, écriture système
Le système SHALL créer des policies sur `audit_logs` autorisant la lecture uniquement au rôle `admin_brikii` et l'écriture uniquement via le service role (jamais depuis le client).

#### Scenario: Admin lit les audit logs
- **WHEN** un utilisateur avec statut `admin_brikii` interroge `audit_logs`
- **THEN** tous les enregistrements sont accessibles

#### Scenario: Utilisateur standard tente de lire les audit logs
- **WHEN** un utilisateur standard interroge `audit_logs`
- **THEN** aucun résultat n'est retourné

### Requirement: Policy factures — lecture propriétaire, écriture service role uniquement
Le système SHALL interdire toute modification des factures depuis le client — seul le webhook Stripe (service role) peut en créer.

#### Scenario: Utilisateur lit ses factures
- **WHEN** un utilisateur authentifié interroge `factures`
- **THEN** seules ses propres factures sont retournées

#### Scenario: Utilisateur tente de créer une facture
- **WHEN** un utilisateur tente d'insérer dans `factures` via le client Supabase
- **THEN** l'opération est refusée par RLS

### Requirement: Policy notifications — destinataire uniquement
Le système SHALL créer une policy sur `notifications` limitant la lecture et la suppression au destinataire (`user_id = auth.uid()`).

#### Scenario: Utilisateur lit ses notifications
- **WHEN** un utilisateur authentifié interroge `notifications`
- **THEN** seules ses notifications sont retournées

### Requirement: Policy documents — selon niveau d'accès
Le système SHALL créer des policies sur `documents` respectant les niveaux : `public` (membres pool), `intercabinet` (charte acceptée), `prive` (demande + accès accordé via `pool_acces_prives`).

#### Scenario: Document public accessible aux membres du pool
- **WHEN** un membre actif du pool interroge un document de niveau `public`
- **THEN** le document est accessible

#### Scenario: Document privé sans accès accordé
- **WHEN** un membre demande un document `prive` sans entrée dans `pool_acces_prives`
- **THEN** le document n'est pas retourné
