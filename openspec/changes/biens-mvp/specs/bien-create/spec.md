## ADDED Requirements

### Requirement: Créer un bien manuellement via formulaire
Le système SHALL permettre à un agent authentifié de créer un bien en saisissant les champs obligatoires (type, adresse, ville, code_postal, prix) et optionnels (surface_hab, descriptif) via `POST /api/biens`. Le statut est initialisé à `brouillon`, `a_verifier = false`. La référence est générée automatiquement côté API.

#### Scenario: Création manuelle réussie
- **WHEN** l'agent saisit les champs obligatoires et soumet
- **THEN** le système crée le bien dans `biens` avec `a_verifier = false`, retourne HTTP 201 avec `{ id, reference }`, et redirige vers `/biens`

#### Scenario: Création d'une maison avec sous-table
- **WHEN** l'agent crée un bien de type `maison` avec des champs de détail disponibles
- **THEN** le système insère dans `biens` ET dans `biens_maisons`

#### Scenario: Création d'un type sans sous-table couverte
- **WHEN** l'agent crée un bien de type `terrain`, `immeuble` ou `commerce`
- **THEN** le système insère uniquement dans `biens` et retourne HTTP 201

#### Scenario: Champs obligatoires manquants
- **WHEN** le formulaire est soumis sans un champ obligatoire
- **THEN** le système affiche une erreur de validation et ne soumet pas

#### Scenario: Accès non authentifié
- **WHEN** une requête POST est envoyée à `/api/biens` sans session valide
- **THEN** le système retourne HTTP 401

### Requirement: Valider les données côté API avec Zod
Le système SHALL valider via Zod toutes les données reçues sur `POST /api/biens`. Champs attendus : `type` (enum), `adresse`, `ville`, `code_postal`, `prix` (obligatoires) ; `surface_hab`, `descriptif`, objet optionnel `details` (champs sous-table). Tout écart MUST retourner HTTP 400.

#### Scenario: Type invalide
- **WHEN** le `type` n'est pas dans l'enum autorisé
- **THEN** l'API retourne HTTP 400 avec le détail Zod

#### Scenario: Données minimales valides
- **WHEN** seuls les champs obligatoires sont fournis
- **THEN** l'API insère dans `biens` uniquement et retourne HTTP 201 avec `{ id, reference }`

### Requirement: Isoler les biens par utilisateur via RLS
Le système SHALL garantir via RLS Supabase qu'un agent ne lit et ne crée que ses propres biens (`user_id = auth.uid()`).

#### Scenario: Lecture cloisonnée
- **WHEN** un agent appelle `GET /api/biens`
- **THEN** uniquement les biens avec `user_id = auth.uid()` sont retournés

### Requirement: Afficher les biens importés avec un badge visuel
Le système SHALL afficher un badge "À vérifier" sur chaque bien dont `a_verifier = true` dans la liste `/biens`, pour signaler à l'agent qu'une relecture des données est recommandée.

#### Scenario: Badge visible sur bien importé
- **WHEN** un bien a `a_verifier = true`
- **THEN** la liste affiche un badge distinctif "À vérifier" sur cet élément

#### Scenario: Pas de badge sur bien manuel
- **WHEN** un bien a `a_verifier = false`
- **THEN** aucun badge "À vérifier" n'est affiché
