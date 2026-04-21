## Requirements

### Requirement: Affichage du formulaire profil pré-rempli
La page `/settings` SHALL afficher un formulaire pré-rempli avec les données actuelles de la table `profiles` pour l'utilisateur connecté. Les champs affichés sont : civilité (sélecteur), prénom, nom, téléphone, statut professionnel (sélecteur), SIREN, RSAC, agence mandante.

#### Scenario: Utilisateur avec données existantes
- **WHEN** l'utilisateur navigue vers `/settings`
- **THEN** le formulaire affiche les valeurs actuelles de chaque champ depuis `profiles`

#### Scenario: Utilisateur sans données (profil vide)
- **WHEN** l'utilisateur navigue vers `/settings` et ses champs sont `null`
- **THEN** le formulaire affiche des champs vides (placeholders visibles)

### Requirement: Mise à jour du profil via Server Action
L'utilisateur SHALL pouvoir soumettre le formulaire pour mettre à jour ses informations. La Server Action MUST valider les données avec Zod avant d'effectuer l'UPDATE Supabase. Seuls les champs éditables sont mis à jour (`civilite`, `prenom`, `nom`, `telephone`, `statut_professionnel`, `siren`, `rsac`, `agence_mandante`). L'`email` n'est pas modifiable dans ce formulaire.

#### Scenario: Sauvegarde réussie
- **WHEN** l'utilisateur soumet le formulaire avec des données valides
- **THEN** la Server Action met à jour `profiles` via le client Supabase server-side, appelle `revalidatePath('/')`, et retourne `{ success: true }`

#### Scenario: Données invalides
- **WHEN** l'utilisateur soumet avec des données ne passant pas la validation Zod (ex. téléphone trop court)
- **THEN** la Server Action retourne `{ success: false, errors: {...} }` sans modifier la base

#### Scenario: Utilisateur non authentifié
- **WHEN** la Server Action est appelée sans session valide
- **THEN** elle retourne une erreur `unauthorized` sans toucher la base

### Requirement: Rafraîchissement de la sidebar après sauvegarde
Après une sauvegarde réussie, la sidebar MUST afficher le nom mis à jour sans rechargement complet de la page.

#### Scenario: Nom mis à jour visible dans la sidebar
- **WHEN** l'utilisateur sauvegarde un nouveau prénom/nom
- **THEN** la sidebar affiche le nouveau nom dans les 2 secondes suivant la confirmation

### Requirement: Feedback utilisateur
L'interface MUST informer l'utilisateur du résultat de la sauvegarde via un toast (bibliothèque `sonner` déjà installée).

#### Scenario: Toast de succès
- **WHEN** la sauvegarde réussit
- **THEN** un toast vert "Profil mis à jour" apparaît en bas à droite

#### Scenario: Toast d'erreur
- **WHEN** la sauvegarde échoue (erreur réseau ou Supabase)
- **THEN** un toast rouge "Erreur lors de la mise à jour" apparaît
