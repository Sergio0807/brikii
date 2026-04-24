## 1. UserProvider (context profil)

- [x] 1.1 Créer `providers/user-provider.tsx` — Context React avec `UserProvider` et hook `useUser()` exposant `{ user, profile }`
- [x] 1.2 Définir le type `UserProfile` (prenom, nom, statut_professionnel, avatar_url) en TypeScript strict

## 2. Layout groupe (app)

- [x] 2.1 Créer `app/(app)/layout.tsx` — Server Component qui vérifie `supabase.auth.getUser()` et redirige vers `/login?redirect=<pathname>` si absent
- [x] 2.2 Charger le profil `profiles` dans le layout et le passer au `UserProvider`
- [x] 2.3 Intégrer `PageLayout` dans le layout `(app)` avec la sidebar et la zone contenu

## 3. Déplacement dashboard

- [x] 3.1 Déplacer `app/dashboard/page.tsx` → `app/(app)/dashboard/page.tsx`
- [x] 3.2 Déplacer `app/dashboard/LogoutButton.tsx` → `app/(app)/dashboard/LogoutButton.tsx`
- [x] 3.3 Supprimer `app/dashboard/` (ancien dossier vide)
- [x] 3.4 Simplifier `app/(app)/dashboard/page.tsx` : supprimer la vérification de session individuelle et la récupération du profil (délégué au layout)

## 4. Adaptation PageLayout

- [x] 4.1 Ajouter une prop optionnelle `profile` à `PageLayout` pour afficher nom/avatar dans la sidebar
- [x] 4.2 Mettre à jour `LogoutButton` pour utiliser `useUser()` si nécessaire

## 5. Vérification

- [x] 5.1 Vérifier que `npx tsc --noEmit` passe sans erreur
- [ ] 5.2 Tester : naviguer vers `/dashboard` sans session → redirect `/login`
- [ ] 5.3 Tester : naviguer vers `/dashboard` avec session → page s'affiche avec sidebar
- [ ] 5.4 Tester : URL `/dashboard` inchangée (groupe `(app)` transparent)
