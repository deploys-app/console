# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev          # start dev server
bun build        # production build
bun preview      # preview production build
bun check        # type-check via svelte-check + jsconfig.json
bun check:watch  # type-check in watch mode
bun lint         # ESLint
bun test         # Playwright e2e tests
```

Before marking any task as complete, always run:
```bash
bun lint   # must pass with zero errors
bun check  # must pass with zero errors
```

For deployment:
```bash
make build   # build Docker image and push to registry.deploys.app
make deploy  # build and deploy to deploys-app project
```

## Architecture

This is a **SvelteKit 2** console for deploys.app, a deployment platform. It uses **Svelte 5** runes (`$state`, `$derived`, `$props`) and is deployed on Cloudflare (default) or Node.js via env-controlled adapter selection.

### Route layout

```
src/routes/
  auth/                        # sign-in / callback / sign-out (unauthenticated)
  (auth)/                      # layout group — redirects to /auth/signin if no token
    (project)/                 # layout group — requires ?project= param
      audit-log/ deployment/ disk/ domain/ dropbox/ email/ env-group/
      pull-secret/ registry/ role/ route/
      service-account/ workload-identity/
    billing/
    project/                   # project selection & creation
  api/[fn]/+server.js          # server-side API proxy (adds auth header, forwards to API_ENDPOINT)
```

The `(auth)` and `(project)` parentheses are SvelteKit route groups — they share layouts without affecting the URL.

### API layer

All API calls go through a single proxy: `POST /api/{fnName}`.

- **Client side**: `src/lib/api/index.js` — `api.invoke(fnName, args, fetch)` posts to the local proxy.
- **Server side**: `src/routes/api/[fn]/+server.js` — reads token from cookies, forwards to `env.API_ENDPOINT` (https://api.deploys.app) with `Authorization: bearer {token}`.
- **Cache invalidation**: `api.invalidate(fn)` / `api.intervalInvalidate(cb, interval)` for polling.
- **Error handling**: `api: unauthorized` → reloads page; `api: forbidden` → `error.forbidden`; `api: validate error` → `error.validate[]`; `api: * not found` → `error.notFound`.

All API types are defined in `src/types/api.d.ts` using TypeScript namespaces (`Api.Profile`, `Api.Response<T>`, `Api.Deployment`, etc.).

### State management

No global store. Data flows via SvelteKit's `load()` functions:
- `+layout.server.js` for server-loaded data (auth token, user profile)
- `+page.js` / `+layout.js` for client-side data fetching
- Svelte 5 runes (`$state`, `$derived`) for component-local state

### Auth

OAuth2 against `auth.deploys.app`. Token stored in httpOnly cookies. `src/hooks.server.js` injects the token into every `/api/*` request and persists the selected project + theme in cookies. The theme cookie (`dark` | `light`) is rendered into the `<html class="…">` placeholder via `transformPageChunk` so the first paint already matches.

### Styling

Tailwind CSS v4 via `@tailwindcss/vite`. The single entry stylesheet is `src/style/app.css` (imported once from `src/routes/(auth)/+layout.svelte` and aliased as `$style`).

`app.css` is the source of truth for design tokens. It contains:
- `:root` and `.dark` blocks that hold the raw HSL/spacing/typography/shadow CSS variables.
- A `@theme inline { … }` block that exposes those variables to Tailwind as `--color-*` / `--font-*` tokens, so utilities like `bg-primary`, `text-content`, `border-line`, `text-positive/80` resolve dynamically per theme.
- An `@layer base` block with element resets and typography rules.
- An `@layer components` block defining the project's component classes: `panel` (with `is-level-{200,300,400}`), `button` (with `is-variant-{secondary,tertiary,negative,positive,accent,underline}`, `is-size-{small,large}`, `is-icon-{left,right}`, `is-loading`), `input` / `select` / `textarea` (with their `[readonly]` / `[disabled]` and `.-has-icon-{left,right}` states), `field`, `checkbox`, `link`, `label`, `breadcrumb(-item)`, `tabs` (with `is-variant-underline`), `table(-container)` (with `is-variant-compact`, `is-collapse`), `dropdown` / `menu` (with `is-card` / `is-compact`), `modal(-panel/-close)`. These replace the removed nomimono dependency — keep using the existing class names rather than reinventing them.

**Dark mode** is the Tailwind class strategy: `<html class="dark">` activates dark utilities. The `dark` variant is registered with `@custom-variant dark (&:where(.dark, .dark *))`. The theme toggle in `Navbar.svelte` writes the cookie and toggles the class on `document.documentElement`.

**Conventions when adding UI**:
- Reach for Tailwind utilities first (`flex`, `gap-3`, `mt-6`, `text-content/70`, `lg:grid-cols-2`, etc.).
- Use the project component classes (`button`, `input`, `panel`, `field`, `table`, `link`, etc.) — don't re-derive them with bare utilities.
- Reference design tokens via the Tailwind utility (`text-primary`) or the underlying CSS var (`hsl(var(--hsl-primary) / 0.12)`) inside scoped `<style>` blocks; both stay in sync with light/dark.
- Scoped `<style>` blocks are plain CSS (no `lang="scss"`, no SCSS nesting) — `sass` is no longer a dependency.

### Modals

Centralized in `src/lib/modal/index.js` — wraps SweetAlert2. Use this for confirmations and form dialogs rather than inline alert/confirm.

### Language note

The codebase uses **JavaScript with JSDoc** type annotations (not TypeScript `.ts` files), checked via `svelte-check` against `jsconfig.json`. Keep new files in `.js`/`.svelte` with JSDoc types.

## Dependencies

### highcharts — pinned to 11.4.8

Our Highcharts license covers **version 11 only**. Do not upgrade to 12+; using a major version outside the licensed range would put us out of compliance. The version is pinned with `=11.4.8` in `package.json`, and `ncu` runs should exclude it (`ncu --reject highcharts`).
