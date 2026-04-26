# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev        # Start dev server (Turbopack, outputs to .next/dev)
npm run build      # Production build (Turbopack)
npm run start      # Start production server
npm run lint       # Run ESLint (replaces removed `next lint`)
```

> `next build` no longer runs linting automatically — run `npm run lint` separately.

## Stack

- **Next.js 16.2.3** — App Router, Turbopack default, React 19.2.4
- **Tailwind CSS v4** via `@tailwindcss/postcss`
- **TypeScript** strict mode, path alias `@/*` → `./*`
- **ESLint** flat config (`eslint.config.mjs`)

## Sources de vérité produit

- **`PRD.md`** — vision globale, modules, BDD, sécurité, RGPD
- **`ARCHITECTURE.md`** — décisions techniques, stack, conventions
- **`docs/briques/`** — briques fonctionnelles commercialisables
  - `docs/briques/pass-adresses.md` — Pass'Adresses (BIA)
  - `docs/briques/immo-cloud.md` — ImmoCloud (documents)
  - `docs/briques/brikii-pool.md` — Brikii Pool (collaboration)
- **`docs/socle/`** — entités du cœur applicatif (non commercialisées seules)
  - `docs/socle/biens.md` — Biens immobiliers
  - `docs/socle/mandats.md` — Mandats
  - `docs/socle/contacts.md` — Contacts / CRM
  - `docs/socle/transactions.md` — Transactions

> Avant d'implémenter une fonctionnalité, lire le fichier de la brique ou de l'entité concernée.
> Ne jamais enrichir le scope sans instruction explicite.
> Toute modification de BDD → migration numérotée dans `migrations/`.

## Architecture

This project uses the **App Router** (`app/` directory):

- `app/layout.tsx` — root layout with Geist fonts and Tailwind base classes
- `app/page.tsx` — home page (Server Component by default)
- `app/globals.css` — global styles (Tailwind imports)

All components are Server Components unless they have `'use client'` at the top.

## Next.js 16 Breaking Changes to Know

**Async Request APIs** — `cookies()`, `headers()`, `draftMode()`, `params`, and `searchParams` must be `await`ed. Synchronous access is fully removed.

```tsx
// Correct in Next.js 16
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
}
```

Use `npx next typegen` to generate `PageProps`, `LayoutProps`, `RouteContext` type helpers.

**Proxy (formerly Middleware)** — `middleware.ts` is renamed to `proxy.ts`; export `proxy` function instead of `middleware`. The `edge` runtime is not supported in `proxy`.

**Caching APIs**:
- `revalidateTag` requires a second `cacheLife` profile argument: `revalidateTag('key', 'max')`
- `cacheLife` / `cacheTag` no longer need the `unstable_` prefix
- Use `updateTag` (Server Actions only) for read-your-writes semantics
- PPR: use `cacheComponents: true` in `next.config.ts` instead of `experimental.ppr`

**Turbopack config** moved from `experimental.turbopack` to top-level `turbopack` in `next.config.ts`.

**Parallel routes** — all `@slot` directories require an explicit `default.js` file or builds fail.

**Removed**:
- `next lint` command (use `eslint` CLI directly)
- `serverRuntimeConfig` / `publicRuntimeConfig` (use env vars)
- AMP support
- `next/legacy/image` (use `next/image`)
- `images.domains` (use `images.remotePatterns`)

**`next/image` defaults changed**: `minimumCacheTTL` is now 4h, `imageSizes` no longer includes `16`, `qualities` defaults to `[75]`.

**Scroll behavior**: Next.js no longer overrides `scroll-behavior` during navigation. Add `data-scroll-behavior="smooth"` to `<html>` to restore previous behavior.

## Notes système Windows

- Toujours utiliser `python` et jamais `python3` sur ce système
- `python3` n'est pas mappé sur ce Windows et renvoie vers le Microsoft Store
- Pour tous les scripts et commandes qui nécessitent Python, utiliser exclusivement `python`
