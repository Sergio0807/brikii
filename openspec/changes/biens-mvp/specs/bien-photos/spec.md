## ADDED Requirements

### Requirement: Persister les photos d'un bien dans `bien_photos`
Le système SHALL disposer d'une table `bien_photos` pour stocker les références Cloudflare Images associées à un bien. Chaque ligne représente une photo : `bien_id` (FK sur `biens`, cascade delete), `cloudflare_image_id` (identifiant Cloudflare, non null), `url` (URL publique Cloudflare, non null), `ordre` (entier, pour trier l'affichage), `created_at`. Le RLS doit garantir qu'un agent ne peut accéder qu'aux photos de ses propres biens.

#### Scenario: Insertion lors de la création d'un bien avec photos
- **WHEN** `POST /api/biens` reçoit un tableau `photos` non vide
- **THEN** le système insère une ligne dans `bien_photos` par photo, liée au `bien_id` nouvellement créé, avec `cloudflare_image_id`, `url` et `ordre` issus du payload

#### Scenario: Création sans photos
- **WHEN** `POST /api/biens` reçoit un tableau `photos` vide ou absent
- **THEN** aucune ligne n'est insérée dans `bien_photos`, le bien est créé normalement

#### Scenario: RLS — accès cloisonné
- **WHEN** un agent lit les photos d'un bien
- **THEN** seules les photos dont le `bien_id` appartient à cet agent (`biens.user_id = auth.uid()`) sont retournées

#### Scenario: Suppression en cascade
- **WHEN** un bien est supprimé (soft delete ou hard delete)
- **THEN** les lignes `bien_photos` associées sont supprimées en cascade par la FK `ON DELETE CASCADE`

### Requirement: Définir la migration SQL `bien_photos`
Le système SHALL créer la table `bien_photos` via une migration Supabase versionée avec la structure suivante : `id uuid PK`, `bien_id uuid NOT NULL REFERENCES biens(id) ON DELETE CASCADE`, `cloudflare_image_id varchar(255) NOT NULL`, `url text NOT NULL`, `ordre integer NOT NULL DEFAULT 0`, `created_at timestamptz NOT NULL DEFAULT now()`. Index sur `bien_id`. RLS activé avec policy d'accès via `biens.user_id = auth.uid()`.

#### Scenario: Migration appliquée en base
- **WHEN** la migration est jouée sur Supabase
- **THEN** la table `bien_photos` existe avec les colonnes et contraintes décrites, RLS activé
