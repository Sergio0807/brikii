## ADDED Requirements

### Requirement: Recherche hybride locale et SIRENE
L'endpoint GET `/api/agences/search?q=<query>` SHALL interroger d'abord la table `agences` locale (full-text sur `nom`, `ville`, `siret`). Si le nombre de résultats locaux est inférieur à 3, il MUST compléter avec l'API SIRENE INSEE filtrée sur les codes NAF immobilier (6820A, 6820B, 6831Z, 6832A, 6832B). La réponse est un tableau JSON unifié de 10 résultats maximum.

#### Scenario: Résultats locaux suffisants
- **WHEN** la query correspond à ≥3 agences dans la table `agences`
- **THEN** l'API retourne uniquement les résultats locaux sans appeler SIRENE

#### Scenario: Résultats locaux insuffisants
- **WHEN** la query correspond à <3 agences locales
- **THEN** l'API appelle SIRENE et fusionne les résultats (locaux en premier, SIRENE ensuite)

#### Scenario: SIRENE indisponible
- **WHEN** l'API SIRENE est inaccessible ou le token est absent
- **THEN** l'API retourne les résultats locaux disponibles sans erreur (statut 200)

#### Scenario: Rate limit dépassé
- **WHEN** une IP envoie plus de 20 requêtes par minute
- **THEN** l'API retourne HTTP 429 avec header `Retry-After`

### Requirement: Vérification SIRET immobilier
L'endpoint POST `/api/agences/verify-siret` avec body `{ siret: string }` SHALL interroger l'API SIRENE pour ce SIRET et MUST vérifier que le code NAF de l'établissement est dans la liste immobilière. Il retourne les données de l'entreprise si valide.

#### Scenario: SIRET valide activité immobilière
- **WHEN** le SIRET correspond à une entreprise avec code NAF immobilier
- **THEN** l'API retourne `{ valid: true, data: { nom, adresse, codeNaf, ... } }`

#### Scenario: SIRET valide activité non immobilière
- **WHEN** le SIRET correspond à une entreprise hors NAF immobilier
- **THEN** l'API retourne `{ valid: false, reason: 'activite_non_immobiliere' }`

#### Scenario: SIRET invalide ou inexistant
- **WHEN** le SIRET ne correspond à aucune entreprise SIRENE
- **THEN** l'API retourne HTTP 404 avec `{ valid: false, reason: 'siret_inconnu' }`
