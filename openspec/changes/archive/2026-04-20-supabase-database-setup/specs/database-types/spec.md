## ADDED Requirements

### Requirement: Types TypeScript générés depuis le schéma Supabase
Le système SHALL maintenir un fichier `types/database.types.ts` généré via la CLI Supabase, reflétant fidèlement toutes les tables, colonnes et types PostgreSQL.

#### Scenario: Type utilisé dans une API Route
- **WHEN** une API Route insère un bien via le client Supabase typé
- **THEN** TypeScript détecte les colonnes manquantes ou mal typées à la compilation

#### Scenario: Regénération après migration
- **WHEN** une nouvelle migration ajoute une colonne à `biens`
- **THEN** la commande `supabase gen types typescript` met à jour `database.types.ts` avec la nouvelle colonne

### Requirement: Types helpers pour les tables principales
Le système SHALL exposer des types dérivés lisibles dans `types/` pour les entités métier (Bien, Mandat, Contact, PassAdresse, Pool, User).

#### Scenario: Autocomplétion dans l'IDE
- **WHEN** un développeur tape `bien.` dans VS Code
- **THEN** toutes les propriétés du type `Bien` sont suggérées avec leurs types corrects
