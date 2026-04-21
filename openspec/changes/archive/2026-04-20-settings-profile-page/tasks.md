## 1. Server Action

- [x] 1.1 Créer `app/actions/profile.ts` avec la Server Action `updateProfile` : validation Zod des champs (civilite, prenom, nom, telephone, statut_professionnel, siren, rsac, agence_mandante), vérification session, UPDATE Supabase via `createClient()` server-side, `revalidatePath('/')`, retour `{ success: true }` ou `{ success: false, error: string }`

## 2. Page Paramètres

- [x] 2.1 Créer `app/(app)/settings/page.tsx` (Server Component) : charger les données du profil depuis Supabase, passer au composant `ProfileForm`
- [x] 2.2 Créer `app/(app)/settings/ProfileForm.tsx` (Client Component `'use client'`) : formulaire avec tous les champs pré-remplis, appel à `updateProfile`, toast `sonner` succès/erreur, `router.refresh()` après succès
- [x] 2.3 Ajouter `AppHeader` avec titre "Paramètres" dans la page settings

## 3. Intégration UI

- [x] 3.1 Vérifier que le lien "Paramètres" dans la sidebar (`PageLayout.tsx`) pointe bien vers `/settings` (déjà en place)
- [x] 3.2 Tester la mise à jour du nom dans la sidebar après sauvegarde
