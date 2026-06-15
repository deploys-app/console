# deploys.app Console

Web console for managing resources on deploys.app.

## Developing

Install dependencies with `bun install`.

Start the development server:

```bash
bun dev

# or start the server and open the app in a new browser tab
bun dev --open
```

### Auth for local development — no secret required

You can run the console locally and sign in **without any client secret**:

- **Pure UI work (no sign-in at all):** `bun dev:mock` runs against static
  fixtures and skips authentication entirely — no login, no backend, no client.
- **Real sign-in (your own account):** plain `bun dev` uses the `localhost`
  OAuth client, which is a **public** client (PKCE, no secret). The default
  `.env` ships `OAUTH2_CLIENT_ID=localhost` with an empty `OAUTH2_CLIENT_SECRET`;
  sign-in goes through `auth.deploys.app` and logs you in as your own Google
  account (you only see your own resources). The authorization code is bound to
  your browser with PKCE, so no secret is needed.

The production deployment configures a confidential client (its own
`OAUTH2_CLIENT_SECRET`); when that variable is set the console sends it at the
token exchange, otherwise it falls back to PKCE-only.

## Building

To create a production build:

```bash
bun build
```

Preview the production build:

```bash
bun preview
```

## Testing

End-to-end tests run with [Playwright](https://playwright.dev) against a mocked API server (see `tests/mock-server.js`).

First-time setup — install the Playwright browsers (only needed once per machine, or after upgrading `@playwright/test`):

```bash
bunx playwright install
```

Then run the tests:

```bash
bun test                          # run the full suite headless
bunx playwright test --ui         # open the interactive test runner
bunx playwright test auth.spec.js # run a single spec
bunx playwright show-report       # open the last HTML report
```

## License

MIT

This project uses Font Awesome Pro. A Font Awesome Pro license is required to edit the source code.
