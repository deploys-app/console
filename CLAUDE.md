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

## Workflow

`main` is protected — all changes must go through a pull request; never commit or push directly to `main`. Branch off the latest `main` (`git checkout main && git pull`), make changes, then open a PR. Merging a PR auto-deletes its branch, which can silently leave your local checkout on `main` — so verify the current branch before committing or pushing.

**UI changes must include screenshots in the PR description.** Any PR that adds or changes user-visible UI (a page, component, modal, layout, or styling) must show the result visually in the PR body — not just describe it. Capture the affected screens with the mock + Playwright (`bun dev:mock`, then screenshot via `@playwright/test`), covering the relevant states (e.g. empty vs populated, a toggle on/off, light/dark when it matters); a before/after is ideal for changes to existing screens. Attach mechanism: store the images on the dedicated **`screenshots`** branch — a long-lived branch that is **never merged into `main`**, so the binaries stay out of the source tree — and embed them in the PR body via raw URLs. Name each file by PR number (`<PR#>-before.png`, `<PR#>-after.png`, or `<PR#>-<label>.png`). Because the filename needs the PR number, open the PR first, then push the screenshots and edit the body to add the links. Reference them as `https://raw.githubusercontent.com/deploys-app/console/screenshots/<file>` — e.g. a side-by-side before/after:

```md
| ![before](https://raw.githubusercontent.com/deploys-app/console/screenshots/<PR#>-before.png) | ![after](https://raw.githubusercontent.com/deploys-app/console/screenshots/<PR#>-after.png) |
| --- | --- |
```

To publish the images (after PR `#<N>` exists):

```bash
git fetch origin screenshots
git worktree add ../.worktrees/console-screenshots screenshots
cp before.png ../.worktrees/console-screenshots/<N>-before.png
cp after.png  ../.worktrees/console-screenshots/<N>-after.png
cd ../.worktrees/console-screenshots && git add . && git commit -m "screenshots: console#<N> before/after" && git push origin screenshots
git worktree remove ../.worktrees/console-screenshots
```

Never commit screenshots into the source tree on `main` just to embed them.

## Architecture

This is a **SvelteKit 2** console for deploys.app, a deployment platform. It uses **Svelte 5** runes (`$state`, `$derived`, `$props`) and is deployed on Node.js via `@sveltejs/adapter-node` (served over h2c by the custom `server.js` entrypoint — see the Dockerfile).

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
- **Mock mode (offline dev)**: `bun dev:mock` (sets `MOCK_API=1`). Both proxies (`api/[fn]` and `api/registry/[fn]`) short-circuit to static fixtures in `src/lib/server/mock.js`, skipping the token check — no real backend or OAuth sign-in needed. Add/adjust a fixture in `mock.js` (`handlers` map) when adding a new API call; unknown functions log a warning and return an empty `ok` response.

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

Two complementary patterns:

- **`src/lib/modal/index.js`** — wraps SweetAlert2 (`confirm` / `error` / `success`). Use for transient alerts, confirmations, and simple prompts rather than inline `alert`/`confirm`.
- **In-page Svelte modal components** — for showing structured or user-provided content, build a small component using the `modal` / `modal-panel` / `modal-close` classes with an exported `open()` and local state (see `ModalSelectProject.svelte`, `EnvGroupModal.svelte`). Prefer this over SweetAlert's `html` option so values render through Svelte interpolation (auto-escaped) instead of hand-built/escaped HTML strings. Bind `aria-hidden` to the open state so the dialog is exposed to assistive tech only while open.

### Language note

The codebase uses **JavaScript with JSDoc** type annotations (not TypeScript `.ts` files), checked via `svelte-check` against `jsconfig.json`. Keep new files in `.js`/`.svelte` with JSDoc types.

## Charts

Charts are rendered in-house as plain SVG — there is no charting dependency (Highcharts was removed). The pieces live under `src/lib/charts/` and `src/lib/components/`:

- **`src/lib/charts/util.js`** — pure helpers shared by the chart components: `niceScale` (round axis ticks), `formatBytes` (binary Ki/Mi/Gi), `formatNumber`, `linePath`/`areaPath` (straight + Catmull-Rom spline), and the `palette` of token-based colors.
- **`LineChart.svelte`** — responsive SVG line/area engine with a time **or** category x-axis, crosshair + floating tooltip, optional legend, and a draw-in animation. Used by `Chart.svelte` (metric panels) and the billing report.
- **`Chart.svelte`** — titled metric panel wrapping `LineChart`; takes the platform metric shape (`{prefix, lines:[{name, points:[[unixSec, val]]}], dashStyle?, color?}`).
- **`WafActivityChart.svelte`** — stacked-column engine for WAF activity (per-action segments over time).

**Colors must stay CSS-var strings applied via inline `style`** (`style:fill`, `style:stroke`, `style:stop-color`) — never SVG presentation attributes, which don't evaluate `var()`. Done this way, charts recolor instantly on theme toggle with no re-render. Keep new chart code dependency-free and on these primitives.
