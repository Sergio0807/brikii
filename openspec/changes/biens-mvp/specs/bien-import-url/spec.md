## ADDED Requirements

### Requirement: Déclencher l'import asynchrone d'un bien depuis une URL
Le système SHALL permettre à un agent authentifié de soumettre une URL d'annonce via `POST /api/biens/import`. L'API crée immédiatement un enregistrement `bien_imports` (status: `pending`), appelle le webhook n8n avec `{ url, import_id, user_id }`, et retourne `{ import_id }` HTTP 202 sans attendre la réponse de n8n.

#### Scenario: Déclenchement réussi
- **WHEN** l'agent soumet une URL valide
- **THEN** le système crée un enregistrement `bien_imports` avec status `pending`, appelle n8n, et retourne HTTP 202 avec `{ import_id }`

#### Scenario: URL absente ou invalide
- **WHEN** le body est absent ou `source_url` n'est pas une URL valide
- **THEN** le système retourne HTTP 400 sans créer d'enregistrement `bien_imports` et sans appeler n8n

#### Scenario: n8n injoignable au déclenchement
- **WHEN** l'appel vers n8n échoue (timeout, erreur réseau)
- **THEN** le système met à jour `bien_imports.status = 'error'`, `error_message = 'Impossible de contacter le service d'import'`, et retourne HTTP 502

#### Scenario: Accès non authentifié
- **WHEN** une requête POST est envoyée à `/api/biens/import` sans session valide
- **THEN** le système retourne HTTP 401 sans créer d'enregistrement

### Requirement: Sécuriser le webhook callback par signature HMAC-SHA256
Le système SHALL vérifier la signature HMAC de **chaque** requête reçue sur `POST /api/webhooks/n8n/biens` avant tout traitement du payload. La vérification DOIT utiliser une comparaison à temps constant pour prévenir les timing attacks. Le secret DOIT être lu depuis la variable d'environnement `N8N_WEBHOOK_SECRET`, jamais codé en dur.

Protocole :
- Header attendu : `x-brikii-signature: sha256=<hex_digest>`
- Calcul attendu : `HMAC-SHA256(rawBody, N8N_WEBHOOK_SECRET)` sur le corps brut de la requête
- Comparaison : `crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))`
- Rejet : HTTP 401 immédiat si header absent, format invalide (`sha256=` manquant), ou signature incorrecte
- Aucune logique métier (lecture BDD, mapping, insertion) n'est exécutée avant validation

#### Scenario: Signature valide
- **WHEN** n8n envoie une requête avec un header `x-brikii-signature` correct
- **THEN** le système passe à la validation Zod du payload

#### Scenario: Header absent
- **WHEN** la requête arrive sans header `x-brikii-signature`
- **THEN** le système retourne HTTP 401 immédiatement, sans lire le body

#### Scenario: Signature incorrecte
- **WHEN** le header est présent mais la signature ne correspond pas au body avec `N8N_WEBHOOK_SECRET`
- **THEN** le système retourne HTTP 401 immédiatement

#### Scenario: `N8N_WEBHOOK_SECRET` non configuré
- **WHEN** la variable d'environnement `N8N_WEBHOOK_SECRET` est vide ou absente
- **THEN** le système retourne HTTP 500 avec un log d'erreur de configuration (pas de message exposé au client)

### Requirement: Recevoir le payload n8n et créer le bien automatiquement
Le système SHALL exposer `POST /api/webhooks/n8n/biens`. Après validation HMAC, l'endpoint valide le payload Zod, met à jour `bien_imports.status = 'mapping'`, puis crée le bien en base (**sans étape de validation par l'agent**) avec `a_verifier = true`. Il met à jour `bien_imports` en conséquence.

#### Scenario: Payload valide, bien créé avec succès
- **WHEN** n8n appelle le webhook avec un payload valide et une signature HMAC correcte
- **THEN** le système crée le bien dans `biens` (a_verifier = true), dans la sous-table si applicable, dans `bien_photos`, met à jour `bien_imports { status: 'completed', bien_id }`, et retourne HTTP 200

#### Scenario: `import_id` inexistant
- **WHEN** le payload contient un `import_id` ne correspondant à aucun enregistrement `bien_imports`
- **THEN** le système retourne HTTP 404

#### Scenario: Payload invalide (champs obligatoires manquants)
- **WHEN** n8n envoie un payload sans les champs obligatoires (`bien.type`, `bien.ville`, `bien.code_postal`, `bien.prix`)
- **THEN** le système met à jour `bien_imports { status: 'error', error_message }` et retourne HTTP 422

#### Scenario: Erreur lors de l'insertion en base
- **WHEN** l'insertion dans `biens` échoue (contrainte, erreur Supabase)
- **THEN** le système met à jour `bien_imports { status: 'error', error_message }` et retourne HTTP 500

### Requirement: Marquer les biens importés comme `a_verifier`
Tout bien créé via le webhook n8n SHALL avoir `a_verifier = true`. Cette valeur est positionnée par l'application lors de l'insertion, indépendamment du contenu du payload n8n.

#### Scenario: Bien importé visible dans la liste
- **WHEN** l'agent consulte `/biens` après un import réussi
- **THEN** le bien apparaît dans la liste avec un indicateur visuel "À vérifier"
