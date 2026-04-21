## Context

La table `profiles` existe avec RLS activé. Le trigger `on_auth_user_created` crée la ligne à l'inscription avec `id` + `email` uniquement. Les champs `prenom`, `nom`, etc. restent `null`. Le layout `app/(app)/layout.tsx` lit déjà le profil depuis Supabase et le passe au `PageLayout` via `UserProvider`. La route `/settings` existe dans le routing (`app/(app)/settings/`) mais n'a pas de `page.tsx`.

## Goals / Non-Goals

**Goals:**
- Page `/settings` avec formulaire pré-rempli des données `profiles` existantes
- Validation Zod côté Server Action
- Mise à jour via Supabase server client (respecte le RLS `profiles_update_own`)
- Rafraîchissement de la sidebar après sauvegarde (`revalidatePath` + `router.refresh()` côté client)
- Feedback utilisateur (toast succès/erreur via `sonner`, déjà installé)

**Non-Goals:**
- Upload d'avatar (Cloudflare Images — V2)
- Changement d'email ou de mot de passe (flow distinct, risque sécurité)
- Gestion multi-utilisateurs ou agence

## Decisions

**Server Action plutôt qu'API Route** — La mise à jour du profil est une mutation simple côté utilisateur authentifié. Une Server Action évite le round-trip HTTP explicite et s'intègre nativement avec `useActionState` / `useTransition` de React 19. L'API Route serait justifiée pour des webhooks ou des appels tiers.

**Validation Zod dans la Server Action** — Toutes les mutations sont validées server-side. Le formulaire est un Client Component (`'use client'`) pour gérer le state de chargement et le toast, mais la logique métier reste sur le serveur.

**`revalidatePath('/dashboard')` + `router.refresh()`** — `revalidatePath` invalide le cache Next.js pour que le layout recharge les données du profil. `router.refresh()` côté client déclenche la navigation sans reload complet. Les deux sont nécessaires pour mettre à jour la sidebar immédiatement.

**Champs optionnels sauf prénom + nom** — On encourage à les remplir mais on ne bloque pas : un agent peut utiliser l'app sans SIREN si pas encore immatriculé.

## Risks / Trade-offs

- **RLS** : La policy `profiles_update_own` utilise `auth.uid() = id`. La Server Action doit utiliser le client Supabase server-side (cookies) pour que le JWT soit transmis. → Utiliser `createClient()` de `lib/supabase/server.ts`, jamais le client browser.
- **Race condition sidebar** : Si `revalidatePath` est trop lent, la sidebar peut afficher les anciennes données 1-2 secondes. → Acceptable pour ce cas d'usage.
