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
      audit-log/ deployment/ disk/ domain/ dropbox/ email/
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

OAuth2 against `auth.deploys.app`. Token stored in httpOnly cookies. `src/hooks.server.js` injects the token into every `/api/*` request and persists the selected project + theme in cookies.

### Styling

Uses the **nomimono-css** design system (classes like `nm-panel`, `nm-button`, `nm-field`). SCSS files live in `src/style/`, imported via the `$style` alias. Theme (dark/light) is stored in a cookie and applied via `data-theme` attribute.

**Before doing any CSS work**, read both:
- The project styles in `src/style/` (`main.scss`, `_theme.scss`) to see project-level tokens, overrides, and conventions.
- The nomimono-css atomic classes in `node_modules/@nomimono/nomimono-css/atomic.css` (also `reset.css`, `layout.css`, `component.css`) to prefer existing utility/component classes over writing new CSS.

Reach for nomimono atomic/component classes first; only add custom SCSS when no existing class fits.

### Modals

Centralized in `src/lib/modal/index.js` — wraps SweetAlert2. Use this for confirmations and form dialogs rather than inline alert/confirm.

### Language note

The codebase uses **JavaScript with JSDoc** type annotations (not TypeScript `.ts` files), checked via `svelte-check` against `jsconfig.json`. Keep new files in `.js`/`.svelte` with JSDoc types.

## Dependencies

### highcharts — pinned to 11.4.8

Our Highcharts license covers **version 11 only**. Do not upgrade to 12+; using a major version outside the licensed range would put us out of compliance. The version is pinned with `=11.4.8` in `package.json`, and `ncu` runs should exclude it (`ncu --reject highcharts`).
