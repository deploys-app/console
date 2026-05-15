import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.PLAYWRIGHT_PORT || 4173)
const MOCK_PORT = Number(process.env.MOCK_PORT || 9999)

// In CI we serve the built app via adapter-node for fast, reliable startup.
// Locally we use the Vite dev server (no build step needed).
const useBuild = !!process.env.PLAYWRIGHT_USE_BUILD

const devCommand = `bun run dev --port ${PORT} --strictPort --host 127.0.0.1`
const buildCommand = 'bun ./build'

/** @type {import('@playwright/test').PlaywrightTestConfig} */
export default defineConfig({
	testDir: './tests',
	testMatch: '**/*.spec.js',
	fullyParallel: false,
	workers: 1,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
	timeout: 60_000,
	expect: { timeout: 10_000 },
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: 'retain-on-failure'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	],
	webServer: [
		{
			command: 'bun tests/mock-server.js',
			port: MOCK_PORT,
			reuseExistingServer: !process.env.CI,
			timeout: 30_000,
			stdout: 'pipe',
			stderr: 'pipe'
		},
		{
			command: useBuild ? buildCommand : devCommand,
			port: PORT,
			reuseExistingServer: !process.env.CI,
			timeout: 240_000,
			stdout: 'pipe',
			stderr: 'pipe',
			env: {
				PORT: String(PORT),
				HOST: '127.0.0.1',
				API_ENDPOINT: `http://localhost:${MOCK_PORT}`,
				REGISTRY_ENDPOINT: `http://localhost:${MOCK_PORT}/__registry`,
				AUTH_ENDPOINT: `http://localhost:${MOCK_PORT}/__auth`,
				PUBLIC_API_ENDPOINT: `http://localhost:${MOCK_PORT}`,
				OAUTH2_CLIENT_ID: 'test-client',
				OAUTH2_CLIENT_SECRET: 'test-secret',
				PUBLIC_SENTRY_DSN: ''
			}
		}
	]
})
