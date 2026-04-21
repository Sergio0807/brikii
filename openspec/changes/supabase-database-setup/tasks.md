## 1. Prérequis & dépendances

- [ ] 1.1 Installer `@supabase/supabase-js` et `@supabase/ssr`
- [ ] 1.2 Renseigner `.env.local` : `NEXT_PUBLIC_SUPABASE_URL=https://lqgifilmqnjxmttsfbzm.supabase.co`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] 1.3 Initialiser Supabase CLI : `supabase init`
- [ ] 1.4 Lier au projet DEV : `supabase link --project-ref lqgifilmqnjxmttsfbzm`

## 2. Extensions PostgreSQL

- [ ] 2.1 Créer `supabase/migrations/001_extensions.sql` — activer `uuid-ossp`, `pgcrypto`, `postgis`
- [ ] 2.2 Appliquer et vérifier dans le dashboard Supabase que les 3 extensions sont actives

## 3. Auth & profil utilisateur

- [ ] 3.1 Créer `supabase/migrations/002_profiles.sql` — table `profiles` liée à `auth.users` (id UUID FK auth.users PK, civilite, prenom, nom, telephone, statut professionnel, siren, rsac, avatar_url, created_at, updated_at, deleted_at, metadata JSONB)
- [ ] 3.2 Ajouter dans la même migration le trigger `handle_new_user` : `AFTER INSERT ON auth.users` → insert automatique dans `profiles`
- [ ] 3.3 Activer RLS sur `profiles` + policy `profiles_owner` : lecture/écriture uniquement si `id = auth.uid()`
- [ ] 3.4 Vérifier le trigger : créer un compte de test via Supabase Auth → vérifier que `profiles` reçoit l'entrée automatiquement

## 4. Agences

- [ ] 4.1 Créer `supabase/migrations/003_agences.sql` — table `agences` (id, nom, type, adresse, code_postal, ville, siret, logo_url, created_at, updated_at, deleted_at, metadata) + table `agence_membres` (id, agence_id FK, user_id FK profiles, role, statut, created_at, updated_at)
- [ ] 4.2 Activer RLS sur `agences` et `agence_membres` + policies de base (lecture membres, écriture propriétaire)

## 5. Biens — version MVP minimale

- [ ] 5.1 Créer `supabase/migrations/004_biens.sql` — table `biens` avec colonnes MVP : id, user_id FK profiles, reference VARCHAR UNIQUE, type (maison|appartement|terrain|immeuble|commerce|entrepot|local_pro|propriete), statut (brouillon|sur_le_marche|sous_offre|vendu|archive), titre, prix, ville, code_postal, latitude DECIMAL(10,8), longitude DECIMAL(11,8), surface_hab, descriptif, nb_pieces, nb_chambres, source_url, source_portail, created_at, updated_at, deleted_at, metadata
- [ ] 5.2 Activer RLS sur `biens` + policy `biens_owner` : toutes opérations si `user_id = auth.uid()`
- [ ] 5.3 Créer index : `idx_biens_user_id`, `idx_biens_statut`, index GIST PostGIS sur (longitude, latitude)

## 6. Mandats — version MVP minimale

- [ ] 6.1 Créer `supabase/migrations/005_mandats.sql` — table `mandats` (id, user_id FK profiles, bien_id FK biens, numero VARCHAR UNIQUE, type (exclusif|simple|semi_exclusif|recherche|gestion), statut, date_signature, date_debut, duree_mois, date_fin, prix_vente, honoraires_pct, honoraires_montant, honoraires_charge, taux_retrocession, document_url, created_at, updated_at, deleted_at, metadata) + table `mandat_proprietaires` (id, mandat_id FK, contact_id FK — contrainte ajoutée après création contacts)
- [ ] 6.2 Activer RLS sur `mandats` + policy `mandats_owner` : toutes opérations si `user_id = auth.uid()`
- [ ] 6.3 Créer index : `idx_mandats_user_id`, `idx_mandats_bien_id`, `idx_mandats_statut`

## 7. Contacts — version MVP minimale

- [ ] 7.1 Créer `supabase/migrations/006_contacts.sql` — table `contacts` (id, user_id FK profiles, civilite, prenom, nom, email, telephone, adresse, code_postal, ville, tags TEXT[], created_at, updated_at, deleted_at, metadata) + table `contact_roles` (id, contact_id FK, role VARCHAR, created_at)
- [ ] 7.2 Activer RLS sur `contacts` et `contact_roles` + policies `owner` sur les deux tables
- [ ] 7.3 Créer index : `idx_contacts_user_id`, `idx_contacts_email`
- [ ] 7.4 Ajouter la FK `mandat_proprietaires.contact_id → contacts.id` (migration `006b_mandat_proprietaires_fk.sql` ou incluse dans 006)

## 8. Pass'Adresses — MVP core

- [ ] 8.1 Créer `supabase/migrations/007_pass_adresses.sql` — table `pass_adresses` (id, user_id FK profiles, bien_id FK biens, mandat_id FK mandats, contact_id FK contacts, magic_token_hash VARCHAR UNIQUE, landing_token VARCHAR UNIQUE, statut (brouillon|envoye|repondu|accepte|refuse|complement|archive), options JSONB, score DECIMAL(4,1), score_grade CHAR(1), prospect_telephone, prospect_telephone_verifie BOOLEAN DEFAULT false, prospect_ip INET, prospect_user_agent TEXT, signature_url, piece_identite_url, zone_code_postal, zone_ville, zone_lat DECIMAL(10,8), zone_lng DECIMAL(11,8), zone_rayon_km INTEGER, budget_min, budget_max, date_envoi TIMESTAMPTZ, date_reponse TIMESTAMPTZ, date_traitement TIMESTAMPTZ, created_at, updated_at, deleted_at, metadata)
- [ ] 8.2 Créer dans la même migration la table `pass_templates` (id, user_id FK profiles, nom, options JSONB, est_defaut BOOLEAN DEFAULT false, created_at, updated_at, deleted_at, metadata) et `pass_relances` (id, pass_adresse_id FK, type (email|sms), statut, date_envoi TIMESTAMPTZ, created_at)
- [ ] 8.3 Activer RLS sur `pass_adresses`, `pass_templates`, `pass_relances` + policies `owner`
- [ ] 8.4 Créer index : `idx_pass_adresses_user_id`, `idx_pass_adresses_magic_token_hash`, `idx_pass_adresses_statut`

## 9. Clients Supabase Next.js

- [ ] 9.1 Créer `lib/supabase/client.ts` — `createBrowserClient` de `@supabase/ssr` pour les composants `'use client'`
- [ ] 9.2 Créer `lib/supabase/server.ts` — `createServerClient` + cookies Next.js pour Server Components et Route Handlers
- [ ] 9.3 Créer `proxy.ts` (racine, Next.js 16) — rafraîchissement de session + protection des routes `(app)/*` (redirect `/login?redirect=...` si pas de session) + protection `/admin/*` (vérification rôle `admin_brikii`)

## 10. Types TypeScript & validation

- [ ] 10.1 Générer `types/database.types.ts` : `supabase gen types typescript --project-id lqgifilmqnjxmttsfbzm > types/database.types.ts`
- [ ] 10.2 Créer `types/index.ts` — types helpers dérivés : `Profile`, `Bien`, `Mandat`, `Contact`, `PassAdresse` depuis `database.types.ts`
- [ ] 10.3 Ajouter dans `CLAUDE.md` la commande de régénération des types

## 11. Tests de connexion & validation

- [ ] 11.1 Lancer `npm run dev` — vérifier absence d'erreurs Supabase dans la console
- [ ] 11.2 Tester l'inscription via Supabase Auth → vérifier la création automatique du profil dans `profiles`
- [ ] 11.3 Tester RLS : avec deux comptes distincts, vérifier qu'aucun ne voit les données de l'autre
- [ ] 11.4 Tester le middleware : accéder à `/dashboard` sans session → vérifier redirection vers `/login`
- [ ] 11.5 Vérifier dans le dashboard Supabase que toutes les migrations sont bien appliquées (onglet Database → Migrations)
