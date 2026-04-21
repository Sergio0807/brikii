## ADDED Requirements

### Requirement: Persister le cycle de vie des imports dans `bien_imports`
Le système SHALL disposer d'une table `bien_imports` pour suivre chaque import asynchrone de bout en bout. Structure : `id uuid PK`, `user_id uuid NOT NULL REFERENCES profiles(id)`, `source_url text NOT NULL`, `status text NOT NULL DEFAULT 'pending'` (enum : `pending`, `scraping`, `mapping`, `completed`, `error`), `bien_id uuid REFERENCES biens(id) ON DELETE SET NULL`, `error_message text`, `n8n_payload jsonb`, `created_at`, `updated_at`. RLS : un agent ne voit que ses propres imports (`user_id = auth.uid()`).

Le `status` est positionné **exclusivement par l'application** selon ce cycle :
- `pending` → à la création
- `scraping` → après appel n8n réussi
- `mapping` → à réception du webhook n8n
- `completed` → après insertion réussie
- `error` → à tout moment d'échec

#### Scenario: Création à pending
- **WHEN** l'agent soumet une URL valide
- **THEN** un enregistrement est créé avec `status = 'pending'`

#### Scenario: Passage à scraping
- **WHEN** l'app appelle n8n avec succès
- **THEN** `bien_imports.status` passe à `'scraping'`

#### Scenario: Passage à mapping
- **WHEN** le webhook n8n est reçu et la signature est valide
- **THEN** `bien_imports.status` passe à `'mapping'`

#### Scenario: Completion réussie
- **WHEN** le bien est créé en base sans erreur
- **THEN** `bien_imports` est mis à jour avec `status = 'completed'` et `bien_id` renseigné

#### Scenario: Erreur à n'importe quelle étape
- **WHEN** n8n est injoignable, ou la validation Zod échoue, ou l'insertion échoue
- **THEN** `bien_imports` est mis à jour avec `status = 'error'` et `error_message` décrivant la cause de façon lisible

### Requirement: Exposer l'état d'un import via API
Le système SHALL exposer `GET /api/biens/import/[id]` retournant `{ status, bien_id, error_message }`. Un agent ne peut consulter que ses propres imports.

#### Scenario: Import en cours (pending ou scraping)
- **WHEN** l'UI interroge l'endpoint et que le status est `pending` ou `scraping`
- **THEN** le système retourne HTTP 200 avec `{ status }`

#### Scenario: Import en mapping
- **WHEN** le status est `mapping`
- **THEN** le système retourne HTTP 200 avec `{ status: 'mapping' }`

#### Scenario: Import terminé
- **WHEN** le status est `completed`
- **THEN** le système retourne HTTP 200 avec `{ status: 'completed', bien_id }`

#### Scenario: Import en erreur
- **WHEN** le status est `error`
- **THEN** le système retourne HTTP 200 avec `{ status: 'error', error_message }`

#### Scenario: Accès à un import d'un autre utilisateur
- **WHEN** un agent tente de lire un `import_id` qui ne lui appartient pas
- **THEN** le système retourne HTTP 404

### Requirement: Afficher l'état d'avancement dans l'UI avec états lisibles
Le système SHALL afficher un composant de suivi avec polling automatique toutes les 5 secondes, affichant un message spécifique par statut.

#### Scenario: État pending
- **WHEN** le status est `pending`
- **THEN** l'UI affiche "En attente de démarrage…" avec indicateur de chargement

#### Scenario: État scraping
- **WHEN** le status est `scraping`
- **THEN** l'UI affiche "Analyse de l'annonce en cours…" avec indicateur de chargement

#### Scenario: État mapping
- **WHEN** le status est `mapping`
- **THEN** l'UI affiche "Enregistrement du bien en cours…" avec indicateur de chargement

#### Scenario: État completed
- **WHEN** le status passe à `completed`
- **THEN** l'UI arrête le polling et redirige automatiquement vers `/biens`

#### Scenario: État error
- **WHEN** le status est `error`
- **THEN** l'UI arrête le polling, affiche `error_message`, et propose deux actions : "Relancer l'import" et "Saisir manuellement"

### Requirement: Détecter et signaler les imports bloqués
Le système SHALL détecter côté UI qu'un import est bloqué si le status est `pending` ou `scraping` depuis plus de 15 minutes (`created_at` > 15 min). L'UI affiche alors un message d'alerte et propose les mêmes actions que pour une erreur : relancer ou saisir manuellement.

#### Scenario: Import bloqué détecté côté UI
- **WHEN** le status est `pending` ou `scraping` et `Date.now() - created_at > 15 min`
- **THEN** l'UI arrête le polling, affiche "L'import prend plus de temps que prévu ou a rencontré un problème.", et propose "Relancer l'import" et "Saisir manuellement"

#### Scenario: Relancer un import bloqué
- **WHEN** l'agent clique "Relancer l'import"
- **THEN** l'UI appelle `POST /api/biens/import` avec la même `source_url`, obtient un nouvel `import_id`, et reprend le suivi depuis le début

#### Scenario: Import en mapping bloqué
- **WHEN** le status est `mapping` depuis plus de 2 minutes
- **THEN** l'UI affiche "Enregistrement en cours, cela prend plus longtemps que prévu…" sans proposer de relance (le mapping est côté app, pas n8n)
