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
