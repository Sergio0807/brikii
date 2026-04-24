## ADDED Requirements

### Requirement: Autocomplete de recherche d'agence
Le composant `AgenceSearchInput` SHALL afficher un champ texte qui déclenche une recherche vers `/api/agences/search?q=` après 300ms de debounce. Les résultats sont affichés dans une liste déroulante avec nom, ville et logo (si disponible).

#### Scenario: Saisie et affichage résultats
- **WHEN** l'utilisateur tape ≥2 caractères dans le champ
- **THEN** une requête est envoyée après 300ms et les résultats s'affichent en liste

#### Scenario: Sélection d'une agence
- **WHEN** l'utilisateur clique sur un résultat
- **THEN** le champ affiche le nom de l'agence sélectionnée et `onSelect(agence)` est appelé

#### Scenario: Aucun résultat
- **WHEN** la recherche ne retourne aucun résultat
- **THEN** le composant affiche "Aucune agence trouvée" et le bouton "Mon agence n'est pas dans la liste"

### Requirement: Modal de demande de création
Lorsque l'utilisateur clique sur "Mon agence n'est pas dans la liste", un modal SHALL s'ouvrir avec un champ SIRET (vérification via `/api/agences/verify-siret`), un champ nom pré-rempli depuis SIRENE si SIRET valide, et un bouton de soumission vers `/api/agences/request`.

#### Scenario: SIRET valide — pré-remplissage
- **WHEN** l'utilisateur saisit un SIRET immobilier valide dans le modal
- **THEN** les champs nom et ville sont pré-remplis depuis les données SIRENE

#### Scenario: SIRET invalide
- **WHEN** l'utilisateur saisit un SIRET non immobilier
- **THEN** un message d'erreur s'affiche sous le champ SIRET et la soumission est bloquée

#### Scenario: Soumission réussie
- **WHEN** l'utilisateur soumet le modal avec des données valides
- **THEN** le modal affiche un message de confirmation "Demande envoyée, nous vous contacterons sous 24h"
