## ADDED Requirements

### Requirement: Extensions PostgreSQL activées
Le système SHALL activer les extensions `postgis`, `uuid-ossp` et `pgcrypto` sur le projet Supabase avant toute création de table.

#### Scenario: Extensions présentes au démarrage
- **WHEN** la première migration est appliquée
- **THEN** les trois extensions sont disponibles dans le schéma PostgreSQL

### Requirement: Colonnes standards sur toutes les tables
Chaque table principale SHALL inclure : `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`, `deleted_at TIMESTAMPTZ` (soft delete), `metadata JSONB DEFAULT '{}'`.

#### Scenario: Création d'un enregistrement
- **WHEN** un enregistrement est inséré sans fournir `id`, `created_at` ou `updated_at`
- **THEN** ces colonnes sont automatiquement renseignées par les valeurs par défaut

#### Scenario: Suppression logique
- **WHEN** `deleted_at` est renseigné sur un enregistrement
- **THEN** l'enregistrement est considéré comme supprimé mais reste en base

### Requirement: Domaine UTILISATEURS (3 tables)
Le système SHALL créer les tables `users`, `agences`, `agence_membres` avec leurs colonnes et contraintes.

`users` : civilite, prenom, nom, email UNIQUE, telephone, statut (agent_immobilier | mandataire | negociateur | responsable_agence | admin_brikii), siren, rsac, avatar_url, auth_user_id UUID REFERENCES auth.users.

`agences` : nom, type, adresse, code_postal, ville, siret, logo_url.

`agence_membres` : user_id FK users, agence_id FK agences, role, statut.

#### Scenario: Unicité email utilisateur
- **WHEN** on tente d'insérer un utilisateur avec un email déjà existant
- **THEN** une contrainte UNIQUE violation est levée

#### Scenario: Liaison auth Supabase
- **WHEN** un utilisateur s'inscrit via Supabase Auth
- **THEN** un trigger crée automatiquement une entrée dans `users` avec `auth_user_id` correspondant

### Requirement: Domaine BIENS (9 tables)
Le système SHALL créer la table centrale `biens` et 8 tables de détails par type.

`biens` : user_id FK, reference VARCHAR UNIQUE, type (maison|appartement|terrain|immeuble|commerce|entrepot|local_pro|propriete), statut (brouillon|sur_le_marche|sous_offre|vendu|archive), titre, prix, ville, code_postal, latitude DECIMAL(10,8), longitude DECIMAL(11,8), surface_hab, descriptif, source_url, source_portail.

Tables détails : `biens_maisons` (surface_terrain, nb_pieces, nb_chambres, nb_sdb, garage, piscine), `biens_appartements` (etage, nb_etages, charges, syndic, ascenseur), `biens_terrains` (surface_totale, constructible, viabilise, zone_plu), `biens_immeubles` (nb_lots, rendement_brut, loyers_annuels), `biens_commerces` (surface_vitrine, bail_type, fonds_commerce), `biens_entrepots` (hauteur_plafond, quais_chargement, puissance_elec), `biens_locaux_pro` (nb_postes_travail, climatisation, fibre), `biens_proprietes` (dependances, plan_eau, foret, vignes, classement).

#### Scenario: Référence unique par bien
- **WHEN** deux biens sont créés par le même utilisateur
- **THEN** leurs références sont distinctes

#### Scenario: Table détails liée au bien
- **WHEN** un bien de type `maison` est créé
- **THEN** une entrée dans `biens_maisons` avec `bien_id` FK peut être associée

### Requirement: Domaine MANDATS (2 tables)
Le système SHALL créer les tables `mandats` et `mandat_proprietaires`.

`mandats` : user_id FK, bien_id FK, numero VARCHAR UNIQUE, type (exclusif|simple|semi_exclusif|recherche|gestion), statut, date_signature, date_debut, duree_mois, date_fin (calculée), prix_vente, honoraires_pct, honoraires_montant, honoraires_charge (vendeur|acquereur|partage), taux_retrocession, document_url.

`mandat_proprietaires` : mandat_id FK, contact_id FK.

#### Scenario: Date de fin calculée
- **WHEN** `date_debut` et `duree_mois` sont renseignés
- **THEN** `date_fin` = date_debut + duree_mois mois

### Requirement: Domaine CONTACTS (6 tables)
Le système SHALL créer les tables `contacts`, `contact_roles`, `contact_biens`, `contact_interactions`, `contact_rappels`, `contact_alertes_biens`.

`contacts` : user_id FK, civilite, prenom, nom, email, telephone, adresse, code_postal, ville, tags TEXT[].

`contact_roles` : contact_id FK, role (proprietaire_vendeur|acquereur|prospect_acquereur|agent_immobilier|notaire|diagnostiqueur|avocat|...).

`contact_interactions` : contact_id FK, type (appel|email|sms|visite|note), date, contenu.

#### Scenario: Contact multi-rôles
- **WHEN** un contact est à la fois acheteur et propriétaire
- **THEN** deux entrées dans `contact_roles` pointent vers le même contact

### Requirement: Domaine PASS'ADRESSES (3 tables)
Le système SHALL créer les tables `pass_adresses`, `pass_templates`, `pass_relances`.

`pass_adresses` : user_id FK, bien_id FK, mandat_id FK, contact_id FK, magic_token_hash VARCHAR, landing_token VARCHAR, statut (brouillon|envoye|repondu|accepte|refuse|complement|archive), options JSONB, score DECIMAL(4,1), score_grade CHAR(1), prospect_telephone, prospect_telephone_verifie BOOLEAN, prospect_ip INET, prospect_user_agent TEXT, signature_url, piece_identite_url, zone_code_postal, zone_lat, zone_lng, zone_rayon_km, budget_min, budget_max, date_envoi, date_reponse, date_traitement.

`pass_templates` : user_id FK, nom, options JSONB, est_defaut BOOLEAN.

`pass_relances` : pass_adresse_id FK, type (email|sms), statut, date_envoi.

#### Scenario: Magic token unique et hashé
- **WHEN** une demande Pass'Adresses est créée
- **THEN** `magic_token_hash` contient le SHA-256 du token (jamais le token en clair)

### Requirement: Domaine POOLS (5 tables)
Le système SHALL créer les tables `pools`, `pool_membres`, `pool_biens`, `pool_acces_prives`, `pool_invitations`.

`pools` : admin_id FK users, nom, description, type (ouvert|ferme), visible_public BOOLEAN, types_mandats_acceptes TEXT[], logo_url, ville, code_postal, charte_version INTEGER, charte_url.

`pool_membres` : pool_id FK, user_id FK, statut (actif|suspendu|exclu), charte_acceptee BOOLEAN, charte_version_acceptee INTEGER, date_adhesion.

#### Scenario: Accès conditionné à la charte
- **WHEN** un membre n'a pas accepté la charte courante
- **THEN** son accès aux biens du pool est bloqué via RLS

### Requirement: Domaine DOCUMENTS (3 tables)
Le système SHALL créer les tables `documents`, `documents_requis`, `documents_acces`.

`documents` : user_id FK, bien_id FK, nom, type_document, niveau_acces (public|intercabinet|prive), storage_path, taille_octets, mime_type, mot_de_passe_hash.

`documents_acces` : document_id FK, user_id FK, ip_address INET, user_agent TEXT.

#### Scenario: Traçabilité des accès
- **WHEN** un utilisateur télécharge un document
- **THEN** une entrée est créée dans `documents_acces` avec ip et user_agent

### Requirement: Domaine ABONNEMENTS (7 tables)
Le système SHALL créer les tables `abonnements`, `abonnements_quotas`, `abonnements_usage`, `factures`, `credits`, `credits_packs`, `parrainages`.

`abonnements` : user_id FK, plan (decouverte|solo|agence|reseau), statut (trial|actif|expire|annule), stripe_customer_id, stripe_subscription_id, date_debut, date_fin, trial_fin.

`abonnements_usage` : user_id FK, mois DATE, bia_utilises INTEGER, biens_pool_actifs INTEGER, stockage_octets BIGINT.

`credits` : user_id FK, montant INTEGER, type (parrainage|invitation_pool|bonus_admin|achat|consommation), description, expire_at.

#### Scenario: Quota BIA mensuel
- **WHEN** un utilisateur utilise un BIA
- **THEN** `abonnements_usage.bia_utilises` est incrémenté pour le mois en cours

### Requirement: Domaine NOTIFICATIONS (2 tables)
Le système SHALL créer les tables `notifications` et `alertes_biens`.

`notifications` : user_id FK, type, titre, contenu, lu BOOLEAN, lien.

`alertes_biens` : user_id FK, types_biens TEXT[], prix_min, prix_max, surface_min, nb_pieces_min, code_postal, rayon_km, frequence (immediat|quotidien|hebdomadaire), actif BOOLEAN.

#### Scenario: Notification non lue
- **WHEN** une notification est créée
- **THEN** `lu` est à FALSE par défaut

### Requirement: Domaine STATISTIQUES (2 tables)
Le système SHALL créer les tables `stats_utilisateurs` et `stats_pools`.

`stats_utilisateurs` : user_id FK, mois DATE, bia_crees, bia_acceptes, bia_refuses, score_moyen, delai_moyen_reponse_min, biens_actifs, biens_vendus.

`stats_pools` : pool_id FK, mois DATE, nb_membres_actifs, nb_biens_partages, vues_pools_immo.

#### Scenario: Statistiques mensuelles
- **WHEN** un mois se termine
- **THEN** les stats sont agrégées et stockées pour ce mois

### Requirement: Domaine SYSTÈME (4 tables)
Le système SHALL créer les tables `nouveautes`, `support_tickets`, `support_messages`, `page_statut`.

`audit_logs` : user_id FK, action, table_name, record_id UUID, old_values JSONB, new_values JSONB, ip_address INET, user_agent TEXT. (table supplémentaire sans soft delete ni metadata)

`support_tickets` : user_id FK, titre, statut (ouvert|en_cours|resolu|ferme), priorite.

`support_messages` : ticket_id FK, user_id FK, contenu, est_staff BOOLEAN.

#### Scenario: Audit log immuable
- **WHEN** une action sensible est tracée dans `audit_logs`
- **THEN** aucune policy RLS ne permet la suppression ou modification
