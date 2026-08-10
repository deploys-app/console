// Static fixture responses for the dev frontend, enabled via MOCK_API.
// Wired into the API proxies (src/routes/api/[fn]/+server.js and
// src/routes/api/registry/[fn]/+server.js) so the console can run fully
// offline without the real api.deploys.app backend or an OAuth token.

import { type ExpressionSpec, parseExpression, parseList, wafListRefs } from '$lib/waf/expression'

const CREATED_AT = '2026-05-01T08:00:00Z'
const LOCATION_ID = 'gke.cluster-rcf2'
const DOMAIN_SUFFIX = 'rcf2.deploys.app'
const USER_EMAIL = 'dev@deploys.app'

// DeploymentStatusIcon fetches statusUrl directly (not via the API proxy) and
// expects a PodStatus JSON. A data: URI lets a success deployment resolve to the
// healthy check icon offline without standing up a real pod-status endpoint.
const HEALTHY_STATUS_URL =
	'data:application/json,' +
	encodeURIComponent(JSON.stringify({ count: 1, ready: 1, succeeded: 0, failed: 0 }))

// An unhealthy pod status (no ready pod) for the erroring deployment fixture,
// so its status icon resolves to the warning state offline.
const UNHEALTHY_STATUS_URL =
	'data:application/json,' +
	encodeURIComponent(JSON.stringify({ count: 2, ready: 0, succeeded: 0, failed: 1 }))

const ok = <T>(result: T = ({} as T)): { ok: true, result: T } => ({ ok: true, result })

const err = (message: string): { ok: false, error: { message: string } } => ({ ok: false, error: { message } })

const list = <T>(items: T[]) => ok({ items })

// deployment.list returns a reduced, non-sensitive projection (Api.DeploymentListItem):
// it omits env + the signed log JWTs (statusUrl/logUrl/…) + the other sensitive
// fields. Mirror that here so the mock list view exercises the real post-change
// behaviour — e.g. the status icon resolves from props without a statusUrl to poll.
const DEPLOYMENT_LIST_OMIT = new Set([
	'env', 'envGroups', 'command', 'args', 'workloadIdentity', 'pullSecret',
	'disk', 'mountData', 'nodePort', 'annotations', 'access', 'sidecars',
	'internalUrl', 'logUrl', 'eventUrl', 'podsUrl', 'statusUrl', 'errorsUrl',
	'address', 'internalAddress'
])
const toDeploymentListItem = (d: Record<string, unknown>): Record<string, unknown> =>
	Object.fromEntries(Object.entries(d).filter(([k]) => !DEPLOYMENT_LIST_OMIT.has(k)))

/**
 * Synthesize a metric line: a single named series of [unixSeconds, value] points.
 */
function metricLine (name: string, base: number) {
	const now = Math.floor(Date.now() / 1000)
	const points = Array.from({ length: 30 }, (_, i) => {
		const wobble = Math.sin(i / 3) * base * 0.25
		return [now - (29 - i) * 120, Math.max(0, Math.round((base + wobble) * 100) / 100)]
	})
	return [{ name, points }]
}

// Two pods of one id-named deployment (`d<id>-<projectID>-<rsHash>-<podHash>`),
// matching how the live (non-aggregate) `deployment.metrics` lines are keyed by
// full pod name. Lets the metrics page exercise the legend's shared-prefix
// stripping (only the trailing pod hash should show).
const MOCK_PODS = ['d128-77-7d8f9b6c5-x2k9p', 'd128-77-7d8f9b6c5-q8m2t']

function metricPodLines (base: number) {
	return MOCK_PODS.map((name, i) => metricLine(name, base * (i === 0 ? 1 : 0.72))[0])
}

/**
 * dailyMetricLine builds a single daily series — one [unixSeconds, value] point
 * per day at midnight for the trailing 30 days — for the daily usage charts.
 */
function dailyMetricLine (name: string, base: number) {
	const day = 86400
	const now = Math.floor(Date.now() / 1000)
	const today = now - (now % day)
	const points = Array.from({ length: 30 }, (_, i) => {
		const wobble = Math.sin(i / 4) * base * 0.3
		return [today - (29 - i) * day, Math.max(0, Math.round(base + wobble))]
	})
	return [{ name, points }]
}

const projects = [
	{
		id: 'prj_mock_acme',
		project: 'acme',
		name: 'Acme Corp',
		billingAccount: 'ba_mock_1',
		quota: { deployments: 50, deploymentMaxReplicas: 10 },
		config: {},
		createdAt: CREATED_AT
	},
	{
		id: 'prj_mock_staging',
		project: 'staging',
		name: 'Staging',
		billingAccount: 'ba_mock_1',
		quota: { deployments: 20, deploymentMaxReplicas: 5 },
		config: {},
		createdAt: CREATED_AT
	},
	{
		id: 'prj_mock_prod',
		project: 'production',
		name: 'Production',
		billingAccount: 'ba_mock_1',
		quota: { deployments: 100, deploymentMaxReplicas: 20 },
		config: {},
		createdAt: CREATED_AT
	},
	{
		id: 'prj_mock_dev',
		project: 'development',
		name: 'Development',
		billingAccount: 'ba_mock_1',
		quota: { deployments: 30, deploymentMaxReplicas: 5 },
		config: {},
		createdAt: CREATED_AT
	},
	{
		id: 'prj_mock_analytics',
		project: 'analytics',
		name: 'Analytics Platform',
		billingAccount: 'ba_mock_1',
		quota: { deployments: 40, deploymentMaxReplicas: 8 },
		config: {},
		createdAt: CREATED_AT
	},
	{
		id: 'prj_mock_payments',
		project: 'payments',
		name: 'Payments Service',
		billingAccount: 'ba_mock_1',
		quota: { deployments: 25, deploymentMaxReplicas: 6 },
		config: {},
		createdAt: CREATED_AT
	},
	{
		id: 'prj_mock_marketing',
		project: 'marketing-site',
		name: 'Marketing Site',
		billingAccount: 'ba_mock_1',
		quota: { deployments: 15, deploymentMaxReplicas: 4 },
		config: {},
		createdAt: CREATED_AT
	},
	{
		id: 'prj_mock_internal',
		project: 'internal-tools',
		name: 'Internal Tools',
		billingAccount: 'ba_mock_1',
		quota: { deployments: 20, deploymentMaxReplicas: 5 },
		config: {},
		createdAt: CREATED_AT
	}
]

const locations = [
	{
		id: LOCATION_ID,
		domainSuffix: DOMAIN_SUFFIX,
		endpoint: 'https://rcf2.deploys.app',
		cname: 'rcf2.deploys.app.',
		cpuAllocatable: ['100m', '250m', '500m', '1000m', '2000m'],
		memoryAllocatable: ['128Mi', '256Mi', '512Mi', '1Gi', '2Gi'],
		features: { workloadIdentity: true, disk: {}, waf: {}, cache: {}, transform: {} },
		createdAt: CREATED_AT
	},
	{
		id: 'gke.cluster-sg1',
		domainSuffix: 'sg1.deploys.app',
		endpoint: 'https://sg1.deploys.app',
		cname: 'sg1.deploys.app.',
		cpuAllocatable: ['100m', '250m', '500m', '1000m', '2000m'],
		memoryAllocatable: ['128Mi', '256Mi', '512Mi', '1Gi', '2Gi'],
		features: { workloadIdentity: true, disk: {}, waf: {}, cache: {}, transform: {} },
		createdAt: CREATED_AT
	}
]

const billingAccounts = [
	{
		id: 'ba_mock_1',
		name: 'Acme Billing',
		type: 'company',
		taxId: '0123456789012',
		taxName: 'Acme Co., Ltd.',
		taxAddress: '1 Mockingbird Lane, Bangkok 10110',
		active: true,
		role: 'owner'
	}
]

// Mutable member list so the Members page add/remove flows are exercisable in
// mock mode (bun dev:mock + Playwright).
const billingOwnerEmail = 'owner@example.com'
let billingMembers = [
	{ email: 'accountant@example.com', role: 'accountant', createdAt: '2026-06-01T09:00:00Z', createdBy: billingOwnerEmail },
	{ email: 'cfo@example.com', role: 'admin', createdAt: '2026-05-12T10:30:00Z', createdBy: billingOwnerEmail }
]

function deployment (project = 'acme') {
	return {
		project,
		location: LOCATION_ID,
		name: 'web',
		type: 'WebService',
		revision: 7,
		image: 'registry.deploys.app/acme/web:latest',
		env: { NODE_ENV: 'production', PORT: '8080' },
		envGroups: ['shared'],
		command: [] as string[],
		args: [] as string[],
		workloadIdentity: '',
		pullSecret: '',
		mountData: {},
		minReplicas: 1,
		maxReplicas: 3,
		schedule: '',
		port: 8080,
		protocol: 'http',
		internal: false,
		nodePort: 0,
		annotations: {},
		resources: {
			requests: { cpu: '100m', memory: '128Mi' },
			limits: { cpu: '500m', memory: '512Mi' }
		},
		sidecars: [],
		// Per-deployment Google-login gate so the Access section renders offline.
		access: {
			requireGoogleLogin: true,
			allowedEmails: ['owner@acme.io'],
			allowedDomains: ['acme.io']
		} as null | { requireGoogleLogin: boolean, allowedEmails: string[], allowedDomains: string[] },
		// Hostnames only — both the Detail and Deployment pages prepend the
		// scheme themselves.
		url: 'web.acme.rcf2.deploys.app',
		internalUrl: 'web.acme.svc.cluster.local',
		// Wired to src/routes/api/mock-logs/+server.js, which streams synthetic
		// SSE only when MOCK_API is set. The token query param is there so the
		// page's `${logUrl}&type=text&raw=1` concatenation produces valid URLs.
		logUrl: '/api/mock-logs?t=mock',
		// Mock pod-event feed (src/routes/api/mock-events/+server.js), so the
		// deployment Events tab is exercisable offline too.
		eventUrl: '/api/mock-events?t=mock',
		podsUrl: '',
		statusUrl: HEALTHY_STATUS_URL,
		// Healthy deployments report no error pods; '' means the UI never fetches.
		// The erroring 'api' fixture below overrides this with a live mock feed.
		errorsUrl: '',
		address: '203.0.113.10',
		// `<kubeName>-<projectID>` (the in-cluster service name); id-named here so
		// the logs/events pages exercise pod-name prefix stripping.
		internalAddress: 'd128-77',
		status: 'success',
		action: 'deploy',
		allocatedPrice: 120.5,
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL,
		successAt: CREATED_AT,
		ttl: 0,
		expiresAt: ''
	}
}

// A Static (bucket-native static web) deployment: no container image/port — it
// references a content-addressed release via `site` (site://…@<release-sha>) and
// `siteManifestDigest`. Lets the detail/revision pages exercise the Release row
// and release-sha rollback offline.
const STATIC_RELEASE_SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00'

function staticDeployment (project = 'acme', releaseSha = STATIC_RELEASE_SHA) {
	return {
		...deployment(project),
		name: 'website',
		type: 'Static',
		// Public static site (no login gate) so the Access section shows the
		// public path; static + login forfeits edge caching.
		access: null,
		image: '',
		site: `site://deploys-static/${project}/website@${releaseSha}`,
		siteManifestDigest: releaseSha,
		command: [] as string[],
		args: [] as string[],
		minReplicas: 0,
		maxReplicas: 0,
		port: 0,
		protocol: '',
		pullSecret: '',
		workloadIdentity: '',
		internalUrl: '',
		internalAddress: '',
		url: 'website.acme.rcf2.deploys.app',
		// Immutable per-release URL: <name>-<release8>.<region> pinned to this
		// release-sha, so the detail page exercises the Release URL row offline.
		releaseUrl: `website-${releaseSha.slice(0, 8)}.acme.rcf2.deploys.app`
	}
}

// An erroring WebService: crash-looping, no ready pod. errorsUrl points at the
// mock /errors feed so the masthead strip + Events Pod Health card render
// offline; UNHEALTHY_STATUS_URL drives the warning status icon.
function erroringDeployment (project = 'acme') {
	return {
		...deployment(project),
		name: 'api',
		status: 'error',
		statusUrl: UNHEALTHY_STATUS_URL,
		errorsUrl: '/api/mock-errors?t=mock'
	}
}

const deployments = [
	deployment('acme'),
	erroringDeployment('acme'),
	staticDeployment('acme'),
	{
		// A TTL'd Static preview, so the list exercises the "expires in" flag.
		...staticDeployment('acme'),
		name: 'website-preview',
		ttl: 7200,
		expiresAt: '2026-06-22T00:00:00Z'
	},
	{
		...deployment('acme'),
		name: 'web-paused',
		status: 'success',
		action: 'pause'
	},
	{
		...deployment('acme'),
		name: 'cron-cleanup',
		type: 'CronJob',
		schedule: '0 * * * *',
		port: 0,
		url: '',
		internalUrl: '',
		address: '',
		status: 'success',
		action: 'pause'
	},
	{
		...deployment('acme'),
		name: 'worker',
		type: 'Worker',
		port: 0,
		url: '',
		internalUrl: '',
		address: '',
		status: 'pending',
		allocatedPrice: 60
	},
	{
		...deployment('acme'),
		name: 'web-old',
		status: 'pending',
		action: 'delete'
	}
]

const disks = [
	{
		project: 'acme',
		location: LOCATION_ID,
		name: 'data',
		size: 10,
		status: 'success',
		action: 'create',
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL,
		successAt: CREATED_AT
	}
]

const domains = [
	{
		project: 'acme',
		location: LOCATION_ID,
		domain: 'acme.example.com',
		wildcard: false,
		verification: {
			ownership: { type: 'TXT', name: '_deploys.acme.example.com', value: 'verify=mock', errors: [] },
			ssl: {
				pending: false,
				dcv: { name: '_acme-challenge.acme.example.com', value: 'mock-dcv' },
				records: [],
				errors: []
			},
			dns: { verifiedAt: CREATED_AT, lastCheckedAt: CREATED_AT, errors: [] }
		},
		dnsConfig: {
			ipv4: ['203.0.113.10'],
			ipv6: ['2001:db8::10'],
			cname: ['rcf2.deploys.app.']
		},
		status: 'success',
		certStatus: 'created',
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL
	},
	{
		project: 'acme',
		location: LOCATION_ID,
		domain: 'stuck.example.com',
		wildcard: false,
		verification: {
			ownership: { type: 'TXT', name: '_deploys.stuck.example.com', value: 'verify=mock', errors: [] },
			ssl: {
				pending: true,
				dcv: { name: '_acme-challenge.stuck.example.com', value: 'mock-dcv' },
				records: [],
				errors: []
			},
			dns: { verifiedAt: CREATED_AT, lastCheckedAt: CREATED_AT, errors: [] }
		},
		dnsConfig: {
			ipv4: ['203.0.113.10'],
			ipv6: ['2001:db8::10'],
			cname: ['rcf2.deploys.app.']
		},
		status: 'success',
		// DNS verified but the cert never issued — pending since long ago, so the
		// console shows the "taking longer than expected" banner + Issuing chip.
		certStatus: 'pendingCreate',
		certPendingSince: CREATED_AT,
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL
	}
]

const routes = [
	{
		location: LOCATION_ID,
		domain: 'acme.example.com',
		path: '/',
		target: 'deployment://web',
		deployment: 'web',
		config: {},
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL
	},
	{
		location: LOCATION_ID,
		domain: 'legacy.example.com',
		path: '/',
		target: 'http://203.0.113.10:8080',
		deployment: 'http://203.0.113.10:8080',
		// External upstream with a Host-header override — the backend
		// virtual-hosts on Host, so the edge forwards `legacy.internal`.
		config: { host: 'legacy.internal' },
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL
	}
]

const wafZone = {
	project: 'acme',
	location: LOCATION_ID,
	description: 'Block admin paths and noisy bots',
	// Seed expressions stay in the visual builder's emitted grammar
	// (double-quoted literals, engine field names) so parseExpression can
	// round-trip them and the waf.test mock evaluator can actually evaluate
	// them — a dry run against the seed zone shows real matches offline.
	rules: [
		{
			id: 'block-admin',
			description: 'Block external access to /admin',
			expression: 'request.path.startsWith("/admin")',
			action: 'block',
			status: 403,
			message: 'Forbidden',
			priority: 10
		},
		{
			id: 'log-bots',
			description: 'Log suspected bot traffic',
			expression: 'containsAny(request.headers["user-agent"], ["bot"])',
			action: 'log',
			priority: 20
		},
		{
			id: 'allow-office',
			description: 'Always allow the office IP list',
			// References the seed named IP list, so the manage page shows the
			// list chip and wafList.delete exercises the in-use guard offline.
			expression: 'ipInList(request.remote_ip, "office-ips")',
			action: 'allow',
			priority: 30
		}
	],
	limits: [
		{
			id: 'per-ip',
			description: 'Baseline per-client limit',
			key: ['ip'],
			rate: 100,
			window: '1m',
			algorithm: 'sliding',
			mode: 'enforce',
			status: 429,
			message: 'Too Many Requests'
		},
		{
			id: 'login-burst',
			description: 'Protect login from credential stuffing',
			key: ['ip', 'header:x-forwarded-user'],
			rate: 10,
			window: '10s',
			algorithm: 'fixed',
			mode: 'shadow',
			filter: 'request.path == "/login" && request.method == "POST"'
		}
	],
	status: 'success',
	action: 'create',
	createdAt: CREATED_AT,
	createdBy: USER_EMAIL
}

const wafRangeSeconds: Record<string, number> = { '1h': 3600, '6h': 21600, '12h': 43200, '1d': 86400, '7d': 604800, '30d': 2592000 }

// Synthetic match metrics for the seed zone, so the firewall index sparkline +
// total and the metrics page have something to draw. Scatters counts across the
// requested window per (rule, action), mirroring waf.metrics' shape (sparse
// buckets, grand total).
function wafMetrics (timeRange?: string) {
	const now = Math.floor(Date.now() / 1000)
	const windowSeconds = wafRangeSeconds[timeRange ?? '1d'] ?? wafRangeSeconds['1d']

	const makeSeries = (ruleId: string, action: Api.WafAction, buckets: number, scale: number) => {
		const points: [number, number][] = []
		let total = 0
		for (let i = 0; i < buckets; i++) {
			const ts = now - Math.floor(Math.random() * windowSeconds)
			const v = 1 + Math.floor(Math.random() * scale)
			points.push([ts, v])
			total += v
		}
		points.sort((a, b) => a[0] - b[0])
		return { ruleId, action, total, points }
	}

	const series = [
		makeSeries('block-admin', 'block', 60, 6),
		makeSeries('log-bots', 'log', 90, 3),
		makeSeries('allow-office', 'allow', 24, 2)
	]
	const total = series.reduce((acc, s) => acc + s.total, 0)
	return { series, total }
}

// Bucket widths per range, matching waf.metrics / waf.limitMetrics server-side.
const wafBucketSeconds: Record<string, number> = { '1h': 60, '6h': 300, '12h': 600, '1d': 1200, '7d': 3600, '30d': 14400 }

// Synthetic rate-limit metrics for the seed zone's two limits, so the
// "Rate limit activity" section has a trend to draw. Each limit gets an
// `allowed` series with large counts and a `limited` series with small counts,
// tuned so the limited share lands around the limit's target with some
// time variation across the window.
function wafLimitMetrics (timeRange?: string) {
	const now = Math.floor(Date.now() / 1000)
	const range = timeRange ?? '1d'
	const windowSeconds = wafRangeSeconds[range] ?? wafRangeSeconds['1d']
	const bucket = wafBucketSeconds[range] ?? wafBucketSeconds['1d']
	const from = now - windowSeconds

	const makeLimit = (limitId: string, base: number, share: number) => {
		const allowed: [number, number][] = []
		const limited: [number, number][] = []
		let allowedTotal = 0
		let limitedTotal = 0
		for (let ts = from + bucket; ts <= now; ts += bucket) {
			const a = Math.round(base * (0.7 + 0.6 * Math.random()))
			allowed.push([ts, a])
			allowedTotal += a
			// Drift the share over the window (sinus + noise) so the trend line
			// actually trends; sparse — calm buckets emit no `limited` point.
			const wave = 0.6 + 0.4 * Math.sin(((ts - from) / windowSeconds) * Math.PI * 5) + 0.4 * Math.random()
			const l = Math.round(a * share * wave)
			if (l > 0) {
				limited.push([ts, l])
				limitedTotal += l
			}
		}
		return [
			{ limitId, result: 'allowed', total: allowedTotal, points: allowed },
			{ limitId, result: 'limited', total: limitedTotal, points: limited }
		]
	}

	const series = [
		...makeLimit('per-ip', 450, 0.018), // share ~0.5–3%
		...makeLimit('login-burst', 80, 0.07) // share ~4–10%
	]
	const total = series.reduce((acc, s) => acc + s.total, 0)
	return { series, total }
}

// Crockford base32 (the ULID alphabet — no I, L, O, U). Event ids must be
// lexicographically time-ordered because waf.events pages with `id < before`.
const ULID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/** Mint a ULID-shaped id: 10 chars of ms timestamp + 16 random chars. */
function mockUlid (ms: number): string {
	let t = ''
	let x = ms
	for (let i = 0; i < 10; i++) {
		t = ULID_ALPHABET[x % 32] + t
		x = Math.floor(x / 32)
	}
	let r = ''
	for (let i = 0; i < 16; i++) r += ULID_ALPHABET[Math.floor(Math.random() * 32)]
	return t + r
}

type MockWafEvent = {
	id: string
	at: string
	ruleId: string
	action: string
	status: number
	clientIp: string
	country: string
	asn: number
	method: string
	host: string
	path: string
}

// Sampled match events for the seed zone, generated once per dev session so
// keyset pagination stays coherent across requests. Spread over the 3-day
// retention window, newest first. IPs are documentation ranges (RFC 5737) —
// realistic-looking, never real. Includes events for `old-block-php`, a rule
// id that no longer exists in the zone, to exercise the deleted-rule fallback.
let wafEventsSeed: MockWafEvent[] | undefined

function wafEventsAll (): MockWafEvent[] {
	if (wafEventsSeed) return wafEventsSeed

	const now = Date.now()
	const pick = <T>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]
	const events: MockWafEvent[] = []

	const host = `acme.${DOMAIN_SUFFIX}`

	// One noisy /24 probing admin paths (the "it's one /24 in RU" story).
	for (let i = 0; i < 70; i++) {
		const ms = now - Math.floor(Math.random() * 3 * 86400_000)
		events.push({
			id: mockUlid(ms),
			at: new Date(ms).toISOString(),
			ruleId: 'block-admin',
			action: 'block',
			status: 403,
			clientIp: `203.0.113.${10 + Math.floor(Math.random() * 40)}`,
			country: pick(['RU', 'RU', 'RU', 'CN', 'VN']),
			asn: pick([12389, 4134, 45899]),
			method: pick(['POST', 'GET', 'POST']),
			host,
			path: pick(['/admin', '/admin/login', '/admin/config.php', '/admin/.env'])
		})
	}
	// Bot traffic that only gets logged.
	for (let i = 0; i < 40; i++) {
		const ms = now - Math.floor(Math.random() * 3 * 86400_000)
		events.push({
			id: mockUlid(ms),
			at: new Date(ms).toISOString(),
			ruleId: 'log-bots',
			action: 'log',
			status: 0,
			clientIp: `198.51.100.${1 + Math.floor(Math.random() * 250)}`,
			country: pick(['US', 'DE', 'SG', 'FR', '']),
			asn: pick([15169, 16509, 14061, 0]),
			method: 'GET',
			host,
			path: pick(['/', '/robots.txt', '/sitemap.xml', '/api/items', '/products'])
		})
	}
	// The office allow rule firing.
	for (let i = 0; i < 8; i++) {
		const ms = now - Math.floor(Math.random() * 3 * 86400_000)
		events.push({
			id: mockUlid(ms),
			at: new Date(ms).toISOString(),
			ruleId: 'allow-office',
			action: 'allow',
			status: 0,
			clientIp: '203.0.113.7',
			country: 'TH',
			asn: 7470,
			method: pick(['GET', 'POST']),
			host,
			path: pick(['/admin', '/admin/metrics'])
		})
	}
	// Events from a rule that was since deleted (waf.set regenerates unknown
	// ids) — the console must render these unlinked with a tooltip.
	for (let i = 0; i < 6; i++) {
		const ms = now - Math.floor(Math.random() * 3 * 86400_000)
		events.push({
			id: mockUlid(ms),
			at: new Date(ms).toISOString(),
			ruleId: 'old-block-php',
			action: 'block',
			status: 403,
			clientIp: `192.0.2.${1 + Math.floor(Math.random() * 250)}`,
			country: pick(['BR', 'IN']),
			asn: pick([26599, 9829]),
			method: 'GET',
			host,
			path: pick(['/wp-login.php', '/xmlrpc.php'])
		})
	}

	// Newest first — ULIDs are time-ordered, so id desc == time desc.
	events.sort((a, b) => (a.id < b.id ? 1 : -1))
	wafEventsSeed = events
	return events
}

// Locations (besides the seed LOCATION_ID) that have had a firewall created in
// this dev session, mapped to { description, polls }. `polls` counts how many
// times the zone has been read while pending; the deployer is simulated by
// flipping the zone from pending → success after the first poll, so the index
// spinner visibly resolves on its own. Lets create → manage flow work too.
const wafConfigured = new Map<string, { description: string, polls: number }>()

/**
 * Build a WAF zone for a session-created location. `advance` simulates the
 * deployer: it's set on waf.list reads (the index poll) so the first list shows
 * pending/create and the next list — after the page polls — settles to success,
 * making the spinner resolve on its own. waf.get reads observe the same state
 * without advancing it.
 */
function wafConfiguredZone (location: string, advance = false) {
	const entry = wafConfigured.get(location) ?? { description: '', polls: 0 }
	const status = entry.polls > 0 ? 'success' : 'pending'
	if (advance) {
		entry.polls += 1
		wafConfigured.set(location, entry)
	}
	return {
		project: 'acme',
		location,
		description: entry.description,
		rules: [],
		limits: [],
		status,
		action: 'create',
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL
	}
}

// ---- waf.test dry run -------------------------------------------------------
// Offline approximation of the server's CEL evaluation, so the test panel
// feels live under `bun dev:mock` (Playwright specs don't use it — they set
// static per-test mocks). Expressions the visual builder can represent
// (parseExpression) are evaluated against the sample request. The RESULT
// SHAPE follows the waf.test contract exactly — outcome/winningRuleId/status/
// message, per-rule matched/evaluated/terminal, per-limit filterMatched/
// counted, valid. Known divergences from the real engine, by design: raw CEL
// the builder can't represent silently reports "not matched" (never an
// error), matches_regex uses JS RegExp not RE2, and eval errors don't exist
// here — never treat a mock verdict as engine truth.

interface WafTestSample {
	method?: string
	path?: string
	query?: string
	host?: string
	scheme?: string
	headers?: Record<string, string>
	cookies?: Record<string, string>
	ip?: string
	country?: string
	asn?: number
}

function wafSampleField (spec: ExpressionSpec, req: WafTestSample): string | number {
	const headers = Object.fromEntries(
		Object.entries(req.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])
	)
	const path = req.path || '/'
	switch (spec.field) {
	case 'method': return (req.method || 'GET').toUpperCase()
	case 'path': return path
	case 'host': return req.host ?? ''
	case 'query': return req.query ?? ''
	case 'uri': return req.query ? `${path}?${req.query}` : path
	case 'scheme': return req.scheme || 'https'
	case 'user_agent': return headers['user-agent'] ?? ''
	case 'referer': return headers.referer ?? ''
	case 'remote_ip': return req.ip ?? ''
	case 'country': return req.country ?? ''
	case 'asn': return req.asn ?? 0
	case 'content_length': return 0 // the synthetic request has no body
	case 'header': return headers[(spec.name ?? '').toLowerCase()] ?? ''
	case 'arg': {
		// first value wins, like the engine's request.args map
		const v = new URLSearchParams(req.query ?? '').get(spec.name ?? '')
		return v ?? ''
	}
	case 'cookie': return (req.cookies ?? {})[spec.name ?? ''] ?? ''
	default: return ''
	}
}

/** Naive IPv4-only CIDR membership — enough for dry-running dev fixtures. */
function wafIpInCidr (ip: string, cidr: string): boolean {
	const [net, bitsRaw] = cidr.split('/')
	const bits = bitsRaw === undefined ? 32 : Number(bitsRaw)
	const toInt = (v: string): number | null => {
		const parts = v.split('.').map(Number)
		if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return null
		return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
	}
	const a = toInt(ip)
	const b = toInt(net)
	if (a === null || b === null || !Number.isInteger(bits) || bits < 0 || bits > 32) return false
	if (bits === 0) return true
	const mask = (~0 << (32 - bits)) >>> 0
	return ((a & mask) >>> 0) === ((b & mask) >>> 0)
}

function wafEvalCondition (spec: ExpressionSpec, req: WafTestSample): boolean {
	const val = wafSampleField(spec, req)
	const s = String(val)
	const list = parseList(spec.values ?? '')
	switch (spec.operator) {
	case 'equals':
		if (spec.tls !== undefined) return spec.tls ? s === 'https' : s === 'http'
		return s === (spec.value ?? '')
	case 'not_equals': return s !== (spec.value ?? '')
	case 'in_list': return list.includes(s)
	case 'not_in_list': return !list.includes(s)
	case 'contains_any': return list.some((v) => s.includes(v))
	case 'starts_with': return s.startsWith(spec.value ?? '')
	case 'not_starts_with': return !s.startsWith(spec.value ?? '')
	case 'ends_with': return s.endsWith(spec.value ?? '')
	case 'not_ends_with': return !s.endsWith(spec.value ?? '')
	case 'matches_regex':
		try { return new RegExp(spec.value ?? '').test(s) } catch { return false }
	case 'ip_equals': return s === (spec.value ?? '')
	case 'in_cidr': return wafIpInCidr(s, spec.value ?? '')
	case 'num_eq': return Number(val) === Number(spec.value)
	case 'num_ne': return Number(val) !== Number(spec.value)
	case 'num_lt': return Number(val) < Number(spec.value)
	case 'num_gt': return Number(val) > Number(spec.value)
	case 'num_le': return Number(val) <= Number(spec.value)
	case 'num_ge': return Number(val) >= Number(spec.value)
	default: return false
	}
}

/**
 * Evaluate a CEL expression against the sample. Returns null when the
 * expression isn't representable by the visual-builder grammar — the mock's
 * stand-in for "can't evaluate" (treated as no match, never as an error).
 * An EMPTY expression matches everything (only limit filters may be empty).
 */
function wafEvalExpression (expr: string, req: WafTestSample): boolean | null {
	const group = parseExpression(expr)
	if (!group) return null
	if (group.conditions.length === 0) return true
	const results = group.conditions.map((c) => wafEvalCondition(c, req))
	return group.combinator === 'or' ? results.some(Boolean) : results.every(Boolean)
}

// Named IP lists (wafList.*). Session-mutable so the lists page CRUD flows
// work offline. `office-ips` is referenced by the seed zone's allow rule, so
// deleting it exercises the in-use guard.
interface MockWafList {
	name: string
	description: string
	type: 'ip'
	entries: string[]
	createdAt: string
	createdBy: string
	updatedAt: string
}

const wafLists = new Map<string, MockWafList>([
	['office-ips', {
		name: 'office-ips',
		description: 'Office egress ranges',
		type: 'ip',
		entries: ['198.51.100.7', '203.0.113.0/24', '2001:db8::/48'],
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL,
		updatedAt: CREATED_AT
	}],
	['monitoring', {
		name: 'monitoring',
		description: 'Uptime probes exempt from rate limits',
		type: 'ip',
		entries: ['192.0.2.10', '192.0.2.11'],
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL,
		updatedAt: CREATED_AT
	}]
])

// Locations of the seed zone's rules/limits referencing `name` — the mock twin
// of the server's ReferencedBy scan over stored expressions.
function wafListReferencedBy (name: string): string[] {
	const referenced =
		wafZone.rules.some((r) => wafListRefs(r.expression).includes(name)) ||
		wafZone.limits.some((l) => 'filter' in l && wafListRefs(l.filter ?? '').includes(name))
	return referenced ? [LOCATION_ID] : []
}

function wafListItem (l: MockWafList) {
	return { project: 'acme', ...l, referencedBy: wafListReferencedBy(l.name) }
}

const cacheZone = {
	project: 'acme',
	location: LOCATION_ID,
	description: 'Force-cache static assets, bypass the admin area',
	overrides: [
		{
			id: 'static-assets',
			description: 'Force long-lived caching for static assets',
			action: 'cache',
			filter: "request.path.startsWith('/static/')",
			ttl: '1h',
			policy: 'balanced',
			staleWhileRevalidate: '30s',
			status: [200],
			mode: 'enforce',
			priority: 0
		},
		{
			id: 'bypass-admin',
			description: 'Never cache the admin area',
			action: 'bypass',
			filter: "request.path.startsWith('/admin')",
			mode: 'enforce',
			priority: 1
		},
		{
			id: 'shadow-api',
			description: 'Trial caching of API GETs (shadow only)',
			action: 'cache',
			filter: "request.path.startsWith('/api/') && request.method == 'GET'",
			ttl: '5m',
			policy: 'aggressive',
			mode: 'shadow',
			priority: 2
		}
	],
	status: 'success',
	action: 'create',
	createdAt: CREATED_AT,
	createdBy: USER_EMAIL
}

// Synthetic cache decision metrics for the seed zone, so the cache index
// sparkline + total and the metrics page have something to draw. Scatters
// counts across the requested window per (override, action, result), mirroring
// cache.metrics' shape (sparse buckets, grand total). Reuses wafRangeSeconds.
function cacheMetrics (timeRange?: string) {
	const now = Math.floor(Date.now() / 1000)
	const windowSeconds = wafRangeSeconds[timeRange ?? '1d'] ?? wafRangeSeconds['1d']

	const makeSeries = (overrideId: string, action: Api.CacheAction, result: Api.CacheMetricsSeries['result'], buckets: number, scale: number) => {
		const points: [number, number][] = []
		let total = 0
		for (let i = 0; i < buckets; i++) {
			const ts = now - Math.floor(Math.random() * windowSeconds)
			const v = 1 + Math.floor(Math.random() * scale)
			points.push([ts, v])
			total += v
		}
		points.sort((a, b) => a[0] - b[0])
		return { overrideId, action, result, total, points }
	}

	const series = [
		makeSeries('static-assets', 'cache', 'applied', 90, 8),
		makeSeries('static-assets', 'cache', 'error', 12, 2),
		makeSeries('bypass-admin', 'bypass', 'applied', 40, 3),
		makeSeries('shadow-api', 'cache', 'shadow', 70, 5)
	]
	const total = series.reduce((acc, s) => acc + s.total, 0)
	return { series, total }
}

// Fills the project cache-performance chart (cache.resultMetrics) with per-result
// requests + bytes over the requested window on an even 48-bucket grid, so the
// stacked HIT/STALE/MISS/BYPASS columns align. BYPASS carries requests but no
// cache bytes (bypassed responses are origin-served), matching production.
function cacheResultMetrics (timeRange?: string) {
	const now = Math.floor(Date.now() / 1000)
	const windowSeconds = wafRangeSeconds[timeRange ?? '1d'] ?? wafRangeSeconds['1d']
	const buckets = 48
	const step = Math.max(60, Math.floor(windowSeconds / buckets))

	const make = (result: Api.CacheResultSeries['result'], reqScale: number, byteScale: number) => {
		const requests: [number, number][] = []
		const bytes: [number, number][] = []
		let requestsTotal = 0
		let bytesTotal = 0
		for (let i = 0; i < buckets; i++) {
			const ts = now - windowSeconds + i * step
			const r = Math.floor(reqScale * (0.5 + Math.random()))
			requests.push([ts, r])
			requestsTotal += r
			const b = Math.floor(byteScale * (0.5 + Math.random()))
			bytes.push([ts, b])
			bytesTotal += b
		}
		return { result, requests, bytes, requestsTotal, bytesTotal }
	}

	return {
		series: [
			make('HIT', 820, 5_200_000),
			make('STALE', 130, 720_000),
			make('MISS', 240, 1_500_000),
			make('BYPASS', 95, 0) // bypass: requests only, no cache bytes
		]
	}
}

// Locations (besides the seed LOCATION_ID) that have had cache configured in
// this dev session, mapped to { description, polls }. Mirrors wafConfigured —
// the simulated deployer flips a freshly created zone from pending → success
// after the first list read, so the index spinner resolves on its own.
const cacheConfigured = new Map<string, { description: string, polls: number }>()

/**
 * Build a cache zone for a session-created location. `advance` simulates the
 * deployer: set on cache.list reads (the index poll) so the first list shows
 * pending/create and the next list settles to success. cache.get reads observe
 * the same state without advancing it.
 */
function cacheConfiguredZone (location: string, advance = false) {
	const entry = cacheConfigured.get(location) ?? { description: '', polls: 0 }
	const status = entry.polls > 0 ? 'success' : 'pending'
	if (advance) {
		entry.polls += 1
		cacheConfigured.set(location, entry)
	}
	return {
		project: 'acme',
		location,
		description: entry.description,
		overrides: [],
		status,
		action: 'create',
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL
	}
}

// Transform — seed zone with a request redirect rule, a response security-
// header rule, and a shadow CORS rule, so the index, manage table, and edit
// page all have content to show.
const transformZone = {
	project: 'acme',
	location: LOCATION_ID,
	description: 'Force www + security headers',
	transforms: [
		{
			id: 'force-www',
			description: 'Force the apex host to www (301)',
			phase: 'request',
			filter: "request.host == 'acme.com'",
			ops: [
				{ type: 'redirect', to: 'https://www.acme.com$uri', status: 301 }
			],
			mode: '',
			priority: 0
		},
		{
			id: 'security-headers',
			description: 'HSTS + security baseline',
			phase: 'response',
			ops: [
				{ type: 'set-header', name: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
				{ type: 'set-header', name: 'X-Content-Type-Options', value: 'nosniff' },
				{ type: 'remove-header', name: 'X-Powered-By' }
			],
			mode: '',
			priority: 1
		},
		{
			id: 'spa-cors',
			description: 'CORS for the SPA (shadow)',
			phase: 'response',
			filter: "request.path.startsWith('/api/')",
			ops: [
				{ type: 'cors', allowOrigins: ['https://app.acme.com'], allowMethods: ['GET', 'POST'], allowHeaders: ['Authorization'], allowCredentials: true, maxAge: '1h' }
			],
			mode: 'shadow',
			priority: 2
		}
	],
	status: 'success',
	action: 'create',
	createdAt: CREATED_AT,
	createdBy: USER_EMAIL
}

// Locations (besides the seed LOCATION_ID) that have had transform configured
// in this dev session, mapped to { description, polls }. Mirrors cacheConfigured
// — the simulated deployer flips a freshly created zone from pending → success
// after the first list read, so the index spinner resolves on its own.
const transformConfigured = new Map<string, { description: string, polls: number }>()

function transformConfiguredZone (location: string, advance = false) {
	const entry = transformConfigured.get(location) ?? { description: '', polls: 0 }
	const status = entry.polls > 0 ? 'success' : 'pending'
	if (advance) {
		entry.polls += 1
		transformConfigured.set(location, entry)
	}
	return {
		project: 'acme',
		location,
		description: entry.description,
		transforms: [],
		status,
		action: 'create',
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL
	}
}

const pullSecrets = [
	{
		name: 'dockerhub',
		value: '',
		spec: { server: 'https://index.docker.io/v1/', username: 'acme', password: '' },
		location: LOCATION_ID,
		action: 'create',
		status: 'success',
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL
	}
]

const workloadIdentities = [
	{
		project: 'acme',
		location: LOCATION_ID,
		name: 'gcs-reader',
		gsa: 'gcs-reader@acme.iam.gserviceaccount.com',
		status: 'success',
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL
	}
]

const envGroups = [
	{
		project: 'acme',
		name: 'shared',
		env: { LOG_LEVEL: 'info', REGION: 'apac' },
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL
	}
]

const schedulerJobs = [
	{
		project: 'acme',
		name: 'daily-health-check',
		schedule: '0 9 * * *',
		timezone: 'Asia/Bangkok',
		method: 'POST',
		url: 'https://api.example.com/health',
		headers: { 'Content-Type': 'application/json' },
		body: '{"check":true}',
		auth: { type: 'bearer' },
		insecureSkipVerify: false,
		paused: false,
		lastResult: 'success',
		lastRunAt: CREATED_AT,
		lastLatencyMs: 142,
		lastHttpStatus: 200,
		lastError: '',
		nextRunAt: CREATED_AT,
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL,
		updatedAt: CREATED_AT,
		updatedBy: USER_EMAIL
	},
	{
		project: 'acme',
		name: 'cache-warmer',
		schedule: '*/15 * * * *',
		timezone: 'UTC',
		method: 'GET',
		url: 'https://example.com/warm',
		headers: {},
		body: '',
		auth: { type: 'none' },
		insecureSkipVerify: false,
		paused: true,
		lastResult: 'failed',
		lastRunAt: CREATED_AT,
		lastLatencyMs: 30021,
		lastHttpStatus: 0,
		lastError: 'context deadline exceeded',
		nextRunAt: null,
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL,
		updatedAt: CREATED_AT,
		updatedBy: USER_EMAIL
	}
]

const schedulerInvocations = [
	{ id: '4', startedAt: CREATED_AT, result: 'pending', httpStatus: 0, latencyMs: 0, error: '' },
	{ id: '3', startedAt: CREATED_AT, result: 'success', httpStatus: 200, latencyMs: 142, error: '' },
	{ id: '2', startedAt: CREATED_AT, result: 'success', httpStatus: 200, latencyMs: 158, error: '' },
	{ id: '1', startedAt: CREATED_AT, result: 'failed', httpStatus: 500, latencyMs: 88, error: 'unexpected status 500' }
]

const notificationChannels = [
	{
		project: 'acme',
		name: 'ops-webhook',
		config: { type: 'webhook', url: 'https://hooks.example.com/deploys', insecureSkipVerify: false },
		subscription: { events: ['deployment.deploy', 'deployment.delete'], outcomes: [] },
		disabled: false,
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL,
		updatedAt: CREATED_AT,
		updatedBy: USER_EMAIL
	},
	{
		project: 'acme',
		name: 'team-discord',
		// the API returns a Discord URL with its secret token redacted
		config: { type: 'discord', url: 'https://discord.com/api/webhooks/123456789/••••••', insecureSkipVerify: false },
		subscription: { events: [], outcomes: ['failure'] },
		disabled: true,
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL,
		updatedAt: CREATED_AT,
		updatedBy: USER_EMAIL
	},
	{
		project: 'acme',
		name: 'local-agent',
		config: { type: 'pull', url: '', insecureSkipVerify: false, pullTtlSeconds: 900 },
		subscription: { events: ['deployment.*'], outcomes: [] },
		disabled: false,
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL,
		updatedAt: CREATED_AT,
		updatedBy: USER_EMAIL
	}
]

const notificationDeliveries = [
	{ id: '4', startedAt: CREATED_AT, result: 'success', httpStatus: 200, latencyMs: 84, error: '' },
	{ id: '3', startedAt: CREATED_AT, result: 'retry', httpStatus: 503, latencyMs: 120, error: 'unexpected status 503' },
	{ id: '2', startedAt: CREATED_AT, result: 'success', httpStatus: 204, latencyMs: 61, error: '' },
	{ id: '1', startedAt: CREATED_AT, result: 'failed', httpStatus: 0, latencyMs: 30002, error: 'context deadline exceeded' }
]

const roles = [
	{
		role: 'viewer',
		name: 'Viewer',
		permissions: ['project.get', 'deployment.list', 'deployment.get'],
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL
	},
	{
		role: 'admin',
		name: 'Administrator',
		permissions: ['*'],
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL
	}
]

const permissions = [
	'project.get', 'project.update', 'project.delete',
	'deployment.list', 'deployment.get', 'deployment.deploy', 'deployment.delete',
	'domain.list', 'domain.get', 'domain.create', 'domain.delete',
	'disk.list', 'disk.get', 'disk.create', 'disk.delete',
	'role.list', 'role.get', 'role.create', 'role.delete', 'role.bind',
	'serviceAccount.list', 'serviceAccount.get', 'serviceAccount.create'
]

interface ServiceAccount {
	sid: string
	email: string
	name: string
	description: string
	createdAt: string
	createdBy: string
}

const serviceAccounts: ServiceAccount[] = [
	{
		sid: 'sa_mock_ci',
		email: 'ci@acme.serviceaccount.deploys.app',
		name: 'CI Deployer',
		description: 'Used by CI to deploy services',
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL
	}
]

// Active scoped (agent) tokens for the mock user. The token value is never
// listed — only the non-secret handle + metadata.
const scopedTokens = [
	{
		id: 'tok_a1b2c3d4e5',
		label: 'claude-code:pr-42',
		permissions: ['deployment.get', 'deployment.logs'],
		createdAt: CREATED_AT,
		expiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString()
	},
	{
		id: 'tok_f6g7h8i9j0',
		label: '',
		permissions: ['dropbox.upload', 'site.publish'],
		createdAt: CREATED_AT,
		expiresAt: new Date(Date.now() + 12 * 60 * 1000).toISOString()
	}
]

interface GithubLink {
	repositoryId: number
	repository: string
	installationId: number
	serviceAccount: string
	serviceAccountEmail: string
	productionBranch: string
	trigger: string
	workflowConfig?: any
	createdAt: string
	createdBy: string
}

// github repo links — mutated by github.link / github.unlink within a session.
const githubLinks: GithubLink[] = [
	{
		repositoryId: 812345678,
		repository: 'acme/web',
		installationId: 77,
		serviceAccount: 'sa_mock_ci',
		serviceAccountEmail: 'ci@acme.serviceaccount.deploys.app',
		productionBranch: 'main',
		// 'all' (default): push to main + PR previews
		trigger: 'all',
		// Saved workflow-generator inputs so the generator pre-fills them offline.
		workflowConfig: {
			name: 'web',
			location: '',
			buildType: 'dockerfile',
			port: 3000,
			protocol: 'h2c',
			framework: 'auto',
			buildCommand: '',
			outputDir: 'public',
			spa: false,
			notFound: '404.html',
			workingDirectory: 'app',
			env: 'NODE_ENV=production\nLOG_LEVEL=info',
			envGroups: ['shared'],
			pullSecret: '',
			requireGoogleLogin: true,
			allowedEmails: 'owner@acme.io',
			allowedDomains: 'acme.io'
		},
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL
	},
	{
		repositoryId: 812345682,
		repository: 'contoso/site',
		installationId: 77,
		serviceAccount: 'sa_mock_ci',
		serviceAccountEmail: 'ci@acme.serviceaccount.deploys.app',
		productionBranch: 'main',
		// 'branch': push to main only, no PR previews
		trigger: 'branch',
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL
	},
	{
		repositoryId: 812345683,
		repository: 'fabrikam/docs',
		installationId: 77,
		serviceAccount: 'sa_mock_ci',
		serviceAccountEmail: 'ci@acme.serviceaccount.deploys.app',
		productionBranch: '',
		// 'pr': previews only — exercises the "PR previews only" card + push-less workflow
		trigger: 'pr',
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL
	}
]

// Synthesize enough rows to exercise the infinite-scroll cursor offline. The
// real backend orders `id desc`; we mirror that here so the array is already in
// the order the API would return.
const auditLogItems = (() => {
	const samples = [
		{ resource: { type: 'Deployment', id: 'web', name: 'web' }, action: 'deployment.deploy', detail: 'Deployed revision' },
		{ resource: { type: 'Domain', id: 'acme.example.com', name: 'acme.example.com' }, action: 'domain.create', detail: 'Added domain' },
		{ resource: { type: 'Disk', id: 'data', name: 'data' }, action: 'disk.create', detail: 'Created disk' },
		{ resource: { type: 'Role', id: 'admin', name: 'admin' }, action: 'role.update', detail: 'Updated role' },
		{ resource: { type: 'PullSecret', id: 'ghcr', name: 'ghcr' }, action: 'pullSecret.create', detail: 'Added pull secret' },
		{ resource: { type: 'EnvGroup', id: 'web-env', name: 'web-env' }, action: 'envGroup.update', detail: 'Updated env group' }
	]
	// cycle through the channels (plus one legacy '' row) so the badge column
	// and the channel filter have varied data offline.
	const channels = ['console', 'cli', 'mcp', 'api', 'console', '']
	const t0 = new Date(CREATED_AT).getTime()
	const items = []
	for (let i = 0; i < 137; i++) {
		const s = samples[i % samples.length]
		const ch = channels[i % channels.length]
		items.push({
			id: 1042 - i,
			resource: { ...s.resource, locationId: LOCATION_ID },
			// mcp-channel rows are agent actions: attribute the agent session via
			// the scoped-token label (the principal is still the minter).
			actor: { email: USER_EMAIL, type: 'User', label: ch === 'mcp' ? 'claude-code:pr-42' : '' },
			channel: ch,
			action: s.action,
			outcome: i % 11 === 0 ? 'failure' : 'success',
			detail: `${s.detail} (#${1042 - i})`,
			createdAt: new Date(t0 - i * 60_000).toISOString()
		})
	}
	return items
})()

const repositories = [
	{ name: 'acme/web', size: 184320000, manifests: 12, tags: 8, createdAt: CREATED_AT },
	{ name: 'acme/worker', size: 92160000, manifests: 5, tags: 3, createdAt: CREATED_AT }
]

const repositoryTags = [
	{ tag: 'latest', digest: 'sha256:1111111111111111111111111111111111111111111111111111111111111111', size: 184320000, createdAt: CREATED_AT },
	{ tag: 'v1.2.0', digest: 'sha256:2222222222222222222222222222222222222222222222222222222222222222', size: 156237824, createdAt: CREATED_AT }
]

const repositoryManifests = [
	{ digest: 'sha256:1111111111111111111111111111111111111111111111111111111111111111', size: 184320000, createdAt: CREATED_AT },
	{ digest: 'sha256:2222222222222222222222222222222222222222222222222222222222222222', size: 156237824, createdAt: CREATED_AT }
]

// Invoices covering every status the UI renders (paid / open / void / draft)
// plus a foreign-currency + zero-tax case and a partial-period case, so the
// status badge and detail layout can be exercised offline. period_end is the
// exclusive first instant of the next period, matching the real backend.
// NOTE: the real billing.listInvoices hides drafts; this mock lists the draft
// too so its badge is visible during dev.
const invoices = [
	{
		id: 'inv_mock_9',
		billingAccountId: 'ba_mock_1',
		number: 'INV-2026-0009',
		currency: 'THB',
		periodStart: '2026-05-01T00:00:00Z',
		periodEnd: '2026-06-01T00:00:00Z',
		subtotal: 1200,
		taxRate: 0.07,
		taxAmount: 84,
		total: 1284,
		status: 'open',
		taxId: '0123456789012',
		taxName: 'Acme Co., Ltd.',
		taxAddress: '1 Mockingbird Lane, Bangkok 10110',
		issuedAt: '2026-06-01T00:00:00Z',
		paidAt: '',
		voidedAt: '',
		createdAt: '2026-06-01T00:00:00Z',
		lineItems: [
			// One line per project: amount is the project's gross (VAT-inclusive) total.
			{ projectId: '1001', project: 'web-frontend', description: 'Web frontend', amount: 900 },
			{ projectId: '1002', project: 'api-service', description: 'API service', amount: 384 }
		]
	},
	{
		id: 'inv_mock_8',
		billingAccountId: 'ba_mock_1',
		number: 'INV-2026-0008',
		currency: 'THB',
		periodStart: '2026-04-01T00:00:00Z',
		periodEnd: '2026-05-01T00:00:00Z',
		subtotal: 150,
		taxRate: 0.07,
		taxAmount: 10.5,
		total: 160.5,
		status: 'draft',
		taxId: '0123456789012',
		taxName: 'Acme Co., Ltd.',
		taxAddress: '1 Mockingbird Lane, Bangkok 10110',
		issuedAt: '',
		paidAt: '',
		voidedAt: '',
		createdAt: '2026-05-01T00:00:00Z',
		lineItems: [
			{ projectId: '1001', project: 'web-frontend', description: 'Web frontend', amount: 160.5 }
		]
	},
	{
		id: 'inv_mock_7',
		billingAccountId: 'ba_mock_1',
		number: 'INV-2026-0007',
		currency: 'THB',
		periodStart: '2026-04-01T00:00:00Z',
		periodEnd: '2026-05-01T00:00:00Z',
		subtotal: 1500,
		taxRate: 0.07,
		taxAmount: 105,
		total: 1605,
		status: 'paid',
		taxId: '0123456789012',
		taxName: 'Acme Co., Ltd.',
		taxAddress: '1 Mockingbird Lane, Bangkok 10110',
		issuedAt: '2026-05-01T00:00:00Z',
		paidAt: '2026-05-03T00:00:00Z',
		voidedAt: '',
		createdAt: '2026-05-01T00:00:00Z',
		lineItems: [
			{ projectId: '1001', project: 'web-frontend', description: 'Web frontend', amount: 1080 },
			{ projectId: '1003', project: 'worker', description: 'Background worker', amount: 525 }
		]
	},
	{
		id: 'inv_mock_6',
		billingAccountId: 'ba_mock_1',
		number: 'INV-2026-0006',
		currency: 'THB',
		periodStart: '2026-03-01T00:00:00Z',
		periodEnd: '2026-04-01T00:00:00Z',
		subtotal: 1080,
		taxRate: 0.07,
		taxAmount: 75.6,
		total: 1155.6,
		status: 'void',
		taxId: '0123456789012',
		taxName: 'Acme Co., Ltd.',
		taxAddress: '1 Mockingbird Lane, Bangkok 10110',
		issuedAt: '2026-04-01T00:00:00Z',
		paidAt: '',
		voidedAt: '2026-04-05T00:00:00Z',
		createdAt: '2026-04-01T00:00:00Z',
		lineItems: [
			{ projectId: '1001', project: 'web-frontend', description: 'Web frontend', amount: 1155.6 }
		]
	},
	{
		id: 'inv_mock_5',
		billingAccountId: 'ba_mock_1',
		number: 'INV-2026-0005',
		currency: 'USD',
		periodStart: '2026-02-01T00:00:00Z',
		periodEnd: '2026-03-01T00:00:00Z',
		subtotal: 11.2,
		taxRate: 0,
		taxAmount: 0,
		total: 11.2,
		status: 'paid',
		taxId: '0123456789012',
		taxName: 'Acme Co., Ltd.',
		taxAddress: '1 Mockingbird Lane, Bangkok 10110',
		issuedAt: '2026-03-01T00:00:00Z',
		paidAt: '2026-03-02T00:00:00Z',
		voidedAt: '',
		createdAt: '2026-03-01T00:00:00Z',
		lineItems: [
			{ projectId: '1001', project: 'web-frontend', description: 'Web frontend', amount: 8 },
			{ projectId: '1002', project: 'api-service', description: 'API service', amount: 3.2 }
		]
	},
	{
		id: 'inv_mock_4',
		billingAccountId: 'ba_mock_1',
		number: 'INV-2026-0004',
		currency: 'THB',
		periodStart: '2026-01-10T00:00:00Z',
		periodEnd: '2026-01-20T00:00:00Z',
		subtotal: 75,
		taxRate: 0.07,
		taxAmount: 5.25,
		total: 80.25,
		status: 'paid',
		taxId: '0123456789012',
		taxName: 'Acme Co., Ltd.',
		taxAddress: '1 Mockingbird Lane, Bangkok 10110',
		issuedAt: '2026-01-21T00:00:00Z',
		paidAt: '2026-01-22T00:00:00Z',
		voidedAt: '',
		createdAt: '2026-01-21T00:00:00Z',
		lineItems: [
			{ projectId: '1001', project: 'web-frontend', description: 'Web frontend', amount: 80.25 }
		]
	}
]

// Seller settlement details returned by billing.getInvoice. Placeholder demo
// values for offline dev — not the real account (the live values come from
// apiserver's invoicepdf.Payment).
const mockPayment = {
	bank: 'Test Bank',
	accountName: 'Demo Seller Co., Ltd.',
	accountNo: '1234567890',
	promptPay: '0812345678'
}

// receiptNumberFor mirrors the server: a paid invoice carries a receipt number
// (DPLY-RC-YYYYMM-NNNN) keyed to its payment month; unpaid invoices have none.
function receiptNumberFor (inv: (typeof invoices)[number]): string {
	if (inv.status !== 'paid' || !inv.paidAt) {
		return ''
	}
	return `DPLY-RC-${inv.paidAt.slice(0, 7).replace('-', '')}-0001`
}

function invoiceListItem (inv: (typeof invoices)[number]) {
	return {
		id: inv.id,
		number: inv.number,
		receiptNumber: receiptNumberFor(inv),
		currency: inv.currency,
		periodStart: inv.periodStart,
		periodEnd: inv.periodEnd,
		subtotal: inv.subtotal,
		taxAmount: inv.taxAmount,
		total: inv.total,
		status: inv.status,
		issuedAt: inv.issuedAt,
		paidAt: inv.paidAt,
		voidedAt: inv.voidedAt,
		createdAt: inv.createdAt
	}
}

const dropboxItems = [
	{
		downloadUrl: 'https://dropbox.deploys.app/d/mock-build.tar.gz',
		filename: 'build.tar.gz',
		size: 5242880,
		ttl: 86400,
		createdAt: CREATED_AT,
		expiresAt: '2026-05-02T08:00:00Z'
	}
]

const handlers: Record<string, (args: any) => object> = {
	'me.get': () => ok({ email: USER_EMAIL }),
	// The mock user is a full-access owner, so every permission probe passes.
	'me.authorized': () => ok({ authorized: true }),
	// Effective grants for the mock user: the '*' wildcard grants everything, so
	// all gated buttons (GuardedButton) render enabled by default offline.
	'me.permissions': () => ok({ permissions: ['*'], admin: false }),
	'me.listTokens': () => list(scopedTokens),
	'me.revokeToken': () => ok({}),

	'project.list': () => list(projects),
	'project.get': (args) => ok(projects.find((p) => p.project === args?.project) ?? { ...projects[0], project: args?.project ?? 'acme' }),
	'project.create': (args) => ok({ ...projects[0], project: args?.project ?? 'new-project', name: args?.name ?? 'New Project' }),
	'project.update': () => ok({}),
	'project.delete': () => ok({}),
	'project.usage': () => ok({
		cpuUsage: 0.42,
		cpu: 1.5,
		memory: 805306368,
		egress: 1073741824,
		cacheEgress: 3221225472,
		registryEgress: 268435456,
		dropboxEgress: 134217728,
		disk: 10737418240,
		replica: 4,
		staticStorage: 25769803776,
		dropboxStorage: 8589934592
	}),
	'project.metrics': () => ok({
		cpuUsage: dailyMetricLine('cpu_usage', 1.5),
		memory: dailyMetricLine('memory', 805306368),
		disk: dailyMetricLine('disk', 10737418240),
		egress: dailyMetricLine('egress', 1073741824),
		cacheEgress: dailyMetricLine('cache_egress', 3221225472),
		replica: dailyMetricLine('replica', 3),
		staticStorage: dailyMetricLine('static_storage', 1610612736)
	}),

	'billing.list': () => list(billingAccounts),
	'billing.get': (args) => ok(billingAccounts.find((b) => b.id === args?.id) ?? { ...billingAccounts[0], id: args?.id ?? 'ba_mock_1' }),
	'billing.create': (args) => ok({ ...billingAccounts[0], id: 'ba_mock_new', name: args?.name ?? 'New Billing' }),
	'billing.update': () => ok({}),
	'billing.delete': () => ok({}),
	'billing.project': () => ok({ price: 180.5 }),
	'billing.report': () => ok({
		projectList: projects.map((p) => ({ sid: p.id, name: p.name })),
		projectSids: projects.map((p) => p.id),
		list: [
			{ projectSid: projects[0].id, name: 'CPU', usageValue: 720, billingValue: 1080 },
			{ projectSid: projects[0].id, name: 'Memory', usageValue: 720, billingValue: 420 },
			{ projectSid: projects[1].id, name: 'CPU', usageValue: 240, billingValue: 360 }
		],
		chart: {
			categories: ['Apr 01', 'Apr 08', 'Apr 15', 'Apr 22', 'Apr 30'],
			series: [
				{ name: 'Acme Corp', data: [40, 55, 48, 60, 52] },
				{ name: 'Staging', data: [10, 12, 9, 14, 11] }
			]
		}
	}),
	'billing.listInvoices': () => list(invoices.map(invoiceListItem)),
	'billing.getInvoice': (args) => {
		const inv = invoices.find((i) => i.id === args?.invoiceId) ?? invoices[0]
		// Demo a 3% withholding-tax deduction on a paid (company) invoice so the
		// receipt/totals show the offline-dev case; unpaid invoices carry none.
		const withholdingTaxAmount = inv.status === 'paid' ? Math.round(inv.subtotal * 0.03 * 100) / 100 : 0
		const withholdingTaxRate = withholdingTaxAmount > 0 ? 0.03 : 0
		return ok({
			...inv,
			receiptNumber: receiptNumberFor(inv),
			taxEntityType: 'company',
			withholdingTaxRate,
			withholdingTaxAmount,
			payment: mockPayment
		})
	},
	'billing.downloadInvoice': (args) => {
		const inv = invoices.find((i) => i.id === args?.invoiceId) ?? invoices[0]
		return ok({
			downloadUrl: `https://dropbox.deploys.app/files/mock-${inv.id}.pdf`,
			expiresAt: '2026-06-02T00:00:00Z'
		})
	},
	// Receipt is paid-only — mirror the API's typed error for other statuses.
	'billing.downloadReceipt': (args) => {
		const inv = invoices.find((i) => i.id === args?.invoiceId) ?? invoices[0]
		if (inv.status !== 'paid') {
			return { ok: false, error: { message: 'api: invoice is not paid' } }
		}
		return ok({
			downloadUrl: `https://dropbox.deploys.app/files/mock-${inv.id}-receipt.pdf`,
			expiresAt: '2026-06-02T00:00:00Z'
		})
	},
	// Multipart upload: the proxy can't JSON-parse the body in mock mode, so
	// args is empty here — just acknowledge the upload.
	'billing.listMembers': () => ok({ owner: billingOwnerEmail, items: billingMembers }),
	'billing.addMember': (args) => {
		const email = String(args?.email ?? '').toLowerCase()
		const role = String(args?.role ?? 'accountant')
		const existing = billingMembers.find((m) => m.email === email)
		if (existing) {
			existing.role = role
		} else {
			billingMembers = [...billingMembers, { email, role, createdAt: '2026-06-30T12:00:00Z', createdBy: billingOwnerEmail }]
		}
		return ok({})
	},
	'billing.removeMember': (args) => {
		const email = String(args?.email ?? '').toLowerCase()
		billingMembers = billingMembers.filter((m) => m.email !== email)
		return ok({})
	},
	'billing.uploadTransferSlip': () => ok({
		downloadUrl: 'https://dropbox.deploys.app/files/mock-slip.jpg',
		expiresAt: '2026-06-02T00:00:00Z'
	}),
	'billing.uploadWHTCertificate': () => ok({
		downloadUrl: 'https://dropbox.deploys.app/files/mock-whtcert.pdf',
		expiresAt: '2027-05-31T00:00:00Z'
	}),

	'auditLog.list': (args) => {
		let arr = auditLogItems
		if (args?.before) {
			const cutoff = new Date(args.before).getTime()
			arr = arr.filter((it) => new Date(it.createdAt).getTime() < cutoff)
		}
		if (args?.after) {
			const lo = new Date(args.after).getTime()
			arr = arr.filter((it) => new Date(it.createdAt).getTime() >= lo)
		}
		if (args?.resourceType) arr = arr.filter((it) => it.resource.type.toLowerCase() === String(args.resourceType).toLowerCase())
		if (args?.actor) arr = arr.filter((it) => it.actor.email === args.actor)
		if (args?.channel) arr = arr.filter((it) => it.channel === args.channel)
		if (args?.outcome) arr = arr.filter((it) => it.outcome === args.outcome)
		return list(arr.slice(0, args?.limit ?? arr.length))
	},

	'location.list': () => list(locations),
	'location.get': (args) => ok(locations.find((l) => l.id === args?.location) ?? locations[0]),

	'deployment.list': () => list(deployments.map(toDeploymentListItem)),
	// revision > 0 returns that revision's historical spec (like the real
	// deployment.get), with per-revision differences so the rollback modal's
	// config diff has something to show.
	'deployment.get': (args) => {
		// Static deployment: distinct release-sha per historical revision so the
		// rollback comparison shows release-sha old → new.
		if (args?.name === 'website') {
			const base = { ...staticDeployment(args?.project), location: args?.location ?? LOCATION_ID }
			const revision = Number(args?.revision ?? 0)
			if (!revision || revision >= base.revision) return ok(base)
			const sha = `${revision}`.repeat(64).slice(0, 64)
			return ok({ ...base, revision, site: `site://deploys-static/${args?.project ?? 'acme'}/website@${sha}`, siteManifestDigest: sha })
		}
		// A TTL'd Static preview, so the detail page exercises the Auto-delete row
		// and its Extend button offline.
		if (args?.name === 'website-preview') {
			return ok({
				...staticDeployment(args?.project),
				name: 'website-preview',
				location: args?.location ?? LOCATION_ID,
				ttl: 7200,
				expiresAt: '2026-06-22T08:00:00Z'
			})
		}
		if (args?.name === 'api') {
			return ok({ ...erroringDeployment(args?.project), location: args?.location ?? LOCATION_ID })
		}
		const base = { ...deployment(args?.project), name: args?.name ?? 'web', location: args?.location ?? LOCATION_ID }
		const revision = Number(args?.revision ?? 0)
		if (!revision || revision >= base.revision) return ok(base)
		return ok({
			...base,
			revision,
			image: base.image.replace(/:latest$/, `:v${revision}`),
			env: { NODE_ENV: 'production', PORT: '8080', LOG_LEVEL: 'debug', FEATURE_FLAGS: 'beta-checkout' },
			maxReplicas: 2,
			command: revision === 5 ? ['node', 'server.js'] : base.command
		})
	},
	'deployment.deploy': () => ok({}),
	'deployment.delete': () => ok({}),
	'deployment.pause': () => ok({}),
	'deployment.resume': () => ok({}),
	'deployment.restart': () => ok({}),
	'deployment.rollback': () => ok({}),
	'deployment.extendTTL': () => ok({}),
	'deployment.revisions': (args) => {
		// Static deployment: per-revision release-shas, no image.
		if (args?.name === 'website') {
			const base = staticDeployment(args?.project)
			return list([7, 6, 5].map((revision) => {
				const sha = revision === base.revision ? STATIC_RELEASE_SHA : `${revision}`.repeat(64).slice(0, 64)
				return {
					...base,
					location: args?.location ?? LOCATION_ID,
					revision,
					site: `site://deploys-static/${args?.project ?? 'acme'}/website@${sha}`,
					siteManifestDigest: sha
				}
			}))
		}
		return list([7, 6, 5].map((revision) => {
			const base = deployment(args?.project)
			return {
				...base,
				name: args?.name ?? 'web',
				location: args?.location ?? LOCATION_ID,
				revision,
				image: revision === base.revision ? base.image : base.image.replace(/:latest$/, `:v${revision}`)
			}
		}))
	},
	'deployment.metrics': () => ok({
		cpuUsage: metricPodLines(0.3),
		cpuLimit: metricPodLines(0.5),
		memoryUsage: metricPodLines(268435456),
		memory: metricPodLines(402653184),
		memoryLimit: metricPodLines(536870912),
		requests: metricPodLines(120),
		egress: metricPodLines(1048576),
		storage: dailyMetricLine('static_storage', 1610612736)
	}),

	// Two synthetic pages (newest-first) so the History view, "Load older", the
	// pod chips and severity colouring all render under bun dev:mock.
	'deployment.logsHistory': (args) => {
		const podA = `${args?.name ?? 'web'}-12-7d9f8-abcde`
		const podB = `${args?.name ?? 'web'}-12-7d9f8-fghij`
		const base = Date.now()
		const mk = (offsetMin: number, pod: string, log: string): Api.DeploymentLogLine => ({
			pod,
			timestamp: new Date(base - offsetMin * 60_000).toISOString(),
			log
		})
		if (args?.cursor) {
			return ok({
				lines: [
					mk(65, podA, 'GET /healthz 200 1ms'),
					mk(70, podB, 'cache warm complete'),
					mk(95, podA, 'WARN slow query took 812ms'),
					mk(120, podA, 'server started, listening on :8080')
				],
				nextCursor: '',
				cappedByBytes: false
			})
		}
		return ok({
			lines: [
				mk(1, podA, 'GET /api/users 200 4ms'),
				mk(2, podB, 'POST /api/login 200 22ms'),
				mk(4, podA, 'ERROR failed to reach upstream: connection refused'),
				mk(5, podA, 'WARN retrying upstream (attempt 2)'),
				mk(9, podB, 'GET /api/users 200 3ms'),
				mk(15, podA, 'DEBUG flushing metrics batch (size=128)')
			],
			nextCursor: 'page2',
			cappedByBytes: false
		})
	},

	// Application-error detection (Sentry-lite). Synthetic issues across kinds
	// and statuses so the Errors tab renders offline. Cursor-aware: the first
	// page returns nextCursor='page2', the second returns the rest with no
	// further cursor. The 'sg1' location simulates a location with no log
	// capture (error detection unavailable).
	'error.list': (args) => {
		if (args?.location === 'gke.cluster-sg1') {
			return err('api: error detection is not available for this location')
		}
		const base = Date.now()
		const at = (mins: number) => new Date(base - mins * 60_000).toISOString()

		// Whether the caller scoped to a single deployment (`name` present) or asked
		// for the project-wide view (`name` omitted). The project-wide list spans
		// several deployments/locations; the per-deployment list stamps every issue
		// with the queried deployment so its `deployment`/`location` echo the query.
		const projectWide = !args?.name
		const deploymentName = String(args?.name ?? 'api')
		const location = String(args?.location ?? LOCATION_ID)

		// Per-deployment fixture: every issue belongs to the queried deployment.
		const single: Api.ErrorIssue[] = [
			{
				id: 'iss_go_nilmap',
				deployment: deploymentName,
				location,
				fingerprint: 'a1b2c3d4e5',
				kind: 'go',
				title: 'panic: assignment to entry in nil map',
				status: 'open',
				count: 1284,
				firstSeen: at(60 * 26),
				lastSeen: at(2),
				samplePod: 'web-12-7d9f8-abcde'
			},
			{
				id: 'iss_py_keyerror',
				deployment: deploymentName,
				location,
				fingerprint: 'b2c3d4e5f6',
				kind: 'python',
				title: "KeyError: 'user_id'",
				status: 'open',
				count: 342,
				firstSeen: at(60 * 9),
				lastSeen: at(11),
				samplePod: 'web-12-7d9f8-fghij'
			},
			{
				id: 'iss_node_undef',
				deployment: deploymentName,
				location,
				fingerprint: 'c3d4e5f6a7',
				kind: 'node',
				title: "TypeError: Cannot read properties of undefined (reading 'id')",
				status: 'open',
				// Loud but stale: highest count yet not the most recent, so sorting by
				// count visibly reorders it above the fresher-but-quieter issues.
				count: 4823,
				firstSeen: at(60 * 4),
				lastSeen: at(38),
				samplePod: 'web-12-7d9f8-abcde'
			},
			{
				id: 'iss_java_npe',
				deployment: deploymentName,
				location,
				fingerprint: 'd4e5f6a7b8',
				kind: 'java',
				title: 'java.lang.NullPointerException: Cannot invoke "String.length()"',
				status: 'muted',
				count: 56,
				firstSeen: at(60 * 40),
				lastSeen: at(60 * 3),
				samplePod: 'web-12-7d9f8-fghij'
			},
			{
				id: 'iss_ruby_nomethod',
				deployment: deploymentName,
				location,
				fingerprint: 'e5f6a7b8c9',
				kind: 'ruby',
				title: "NoMethodError: undefined method `name' for nil:NilClass",
				status: 'resolved',
				count: 19,
				firstSeen: at(60 * 72),
				lastSeen: at(60 * 30),
				samplePod: 'web-12-7d9f8-abcde'
			},
			{
				id: 'iss_generic_oom',
				deployment: deploymentName,
				location,
				fingerprint: 'f6a7b8c9d0',
				kind: 'generic',
				title: 'fatal: out of memory allocating 268435456 bytes',
				status: 'resolved',
				count: 4,
				firstSeen: at(60 * 90),
				lastSeen: at(60 * 50),
				samplePod: 'web-12-7d9f8-fghij'
			}
		]

		// Project-wide fixture: issues span several deployments + locations and
		// every kind/status, enough to page across two screens. Sorted lastSeen
		// desc to match the page's default sort.
		const wide: Api.ErrorIssue[] = [
			{
				id: 'iss_api_go_nilmap',
				deployment: 'api',
				location: LOCATION_ID,
				fingerprint: 'a1b2c3d4e5',
				kind: 'go',
				title: 'panic: assignment to entry in nil map',
				status: 'open',
				count: 1284,
				firstSeen: at(60 * 26),
				lastSeen: at(2),
				samplePod: 'api-12-7d9f8-abcde'
			},
			{
				id: 'iss_web_node_undef',
				deployment: 'web',
				location: LOCATION_ID,
				fingerprint: 'c3d4e5f6a7',
				kind: 'node',
				title: "TypeError: Cannot read properties of undefined (reading 'id')",
				status: 'open',
				count: 612,
				firstSeen: at(60 * 4),
				lastSeen: at(7),
				samplePod: 'web-44-58cd1-pqrst'
			},
			{
				id: 'iss_worker_py_keyerror',
				deployment: 'worker',
				location: 'gke.cluster-rcf3',
				fingerprint: 'b2c3d4e5f6',
				kind: 'python',
				title: "KeyError: 'user_id'",
				status: 'open',
				count: 342,
				firstSeen: at(60 * 9),
				lastSeen: at(11),
				samplePod: 'worker-9-7d9f8-fghij'
			},
			{
				id: 'iss_billing_ruby_nomethod',
				deployment: 'billing',
				location: LOCATION_ID,
				fingerprint: 'e5f6a7b8c9',
				kind: 'ruby',
				title: "NoMethodError: undefined method `name' for nil:NilClass",
				status: 'open',
				count: 128,
				firstSeen: at(60 * 12),
				lastSeen: at(24),
				samplePod: 'billing-3-aa18c-klmno'
			},
			{
				id: 'iss_api_java_npe',
				deployment: 'api',
				location: LOCATION_ID,
				fingerprint: 'd4e5f6a7b8',
				kind: 'java',
				title: 'java.lang.NullPointerException: Cannot invoke "String.length()"',
				status: 'muted',
				count: 56,
				firstSeen: at(60 * 40),
				lastSeen: at(60 * 3),
				samplePod: 'api-12-7d9f8-fghij'
			},
			{
				id: 'iss_web_go_index',
				deployment: 'web',
				location: 'gke.cluster-rcf3',
				fingerprint: 'aa11bb22cc',
				kind: 'go',
				title: 'panic: runtime error: index out of range [3] with length 3',
				status: 'open',
				count: 41,
				firstSeen: at(60 * 6),
				lastSeen: at(60 * 4),
				samplePod: 'web-44-58cd1-uvwxy'
			},
			{
				id: 'iss_worker_generic_oom',
				deployment: 'worker',
				location: 'gke.cluster-rcf3',
				fingerprint: 'f6a7b8c9d0',
				kind: 'generic',
				title: 'fatal: out of memory allocating 268435456 bytes',
				status: 'resolved',
				count: 17,
				firstSeen: at(60 * 90),
				lastSeen: at(60 * 50),
				samplePod: 'worker-9-7d9f8-zabcd'
			},
			{
				id: 'iss_billing_py_zerodiv',
				deployment: 'billing',
				location: LOCATION_ID,
				fingerprint: '0a1b2c3d4e',
				kind: 'python',
				title: 'ZeroDivisionError: division by zero',
				status: 'resolved',
				count: 5,
				firstSeen: at(60 * 120),
				lastSeen: at(60 * 80),
				samplePod: 'billing-3-aa18c-efghi'
			}
		]

		const all = projectWide ? wide : single
		const status = (args?.status as Api.ErrorStatusFilter | undefined) ?? 'open'
		const filtered = status === 'all' ? all : all.filter((it) => it.status === status)
		// Honour the requested ordering so the sort control is exercised in mock dev.
		const sort = (args?.sort as Api.ErrorSort | undefined) ?? 'lastSeen'
		const sorted = [...filtered].sort((a, b) => {
			if (sort === 'count') return b.count - a.count
			if (sort === 'firstSeen') return Date.parse(b.firstSeen) - Date.parse(a.firstSeen)
			return Date.parse(b.lastSeen) - Date.parse(a.lastSeen)
		})
		// Two-page paging: first request (no cursor) returns the first 3, then
		// nextCursor='page2' yields the remainder. Pages are only meaningful when
		// the filter leaves more than one page.
		if (!args?.cursor) {
			const head = sorted.slice(0, 3)
			return ok({ issues: head, nextCursor: sorted.length > 3 ? 'page2' : undefined })
		}
		return ok({ issues: sorted.slice(3), nextCursor: undefined })
	},
	'error.get': (args) => {
		const base = Date.now()
		const at = (mins: number) => new Date(base - mins * 60_000).toISOString()
		const samples: Record<string, { title: string, sample: string }> = {
			iss_go_nilmap: {
				title: 'panic: assignment to entry in nil map',
				sample: 'panic: assignment to entry in nil map\n\n' +
					'goroutine 17 [running]:\n' +
					'main.(*Server).handleCheckout(0xc0001a4000, {0x9b2e40, 0xc0002b8000}, 0xc0001fe000)\n' +
					'\t/app/internal/server/checkout.go:142 +0x1f4\n' +
					'net/http.HandlerFunc.ServeHTTP(0xc0001b0000, {0x9b2e40, 0xc0002b8000}, 0xc0001fe000)\n' +
					'\t/usr/local/go/src/net/http/server.go:2136 +0x2f\n' +
					'net/http.(*ServeMux).ServeHTTP(0xc0001c0000, {0x9b2e40, 0xc0002b8000}, 0xc0001fe000)\n' +
					'\t/usr/local/go/src/net/http/server.go:2514 +0x149'
			},
			iss_py_keyerror: {
				title: "KeyError: 'user_id'",
				sample: 'Traceback (most recent call last):\n' +
					'  File "/app/handlers/checkout.py", line 88, in post\n' +
					'    user = session["user_id"]\n' +
					'  File "/app/lib/session.py", line 42, in __getitem__\n' +
					'    return self._data[key]\n' +
					"KeyError: 'user_id'"
			},
			iss_node_undef: {
				title: "TypeError: Cannot read properties of undefined (reading 'id')",
				sample: "TypeError: Cannot read properties of undefined (reading 'id')\n" +
					'    at resolveUser (/app/src/auth.js:51:23)\n' +
					'    at /app/src/routes/checkout.js:18:30\n' +
					'    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)\n' +
					'    at next (/app/node_modules/express/lib/router/route.js:144:13)'
			},
			iss_java_npe: {
				title: 'java.lang.NullPointerException: Cannot invoke "String.length()"',
				sample: 'java.lang.NullPointerException: Cannot invoke "String.length()" because "name" is null\n' +
					'\tat com.acme.checkout.CheckoutService.validate(CheckoutService.java:73)\n' +
					'\tat com.acme.checkout.CheckoutController.post(CheckoutController.java:41)\n' +
					'\tat java.base/jdk.internal.reflect.DirectMethodHandleAccessor.invoke(DirectMethodHandleAccessor.java:103)'
			},
			iss_ruby_nomethod: {
				title: "NoMethodError: undefined method `name' for nil:NilClass",
				sample: "app/services/checkout_service.rb:24:in `validate': undefined method `name' for nil:NilClass (NoMethodError)\n" +
					"\tfrom app/controllers/checkout_controller.rb:12:in `create'\n" +
					"\tfrom actionpack (7.1.0) lib/action_controller/metal/basic_implicit_render.rb:8:in `send_action'"
			},
			iss_generic_oom: {
				title: 'fatal: out of memory allocating 268435456 bytes',
				sample: 'fatal: out of memory allocating 268435456 bytes\n' +
					'  while processing batch job #4821\n' +
					'  rss=512MiB limit=512MiB'
			}
		}
		const id = String(args?.id ?? 'iss_go_nilmap')
		const s = samples[id] ?? samples.iss_go_nilmap
		const issue: Api.ErrorIssueDetail = {
			id,
			deployment: String(args?.name ?? 'api'),
			location: String(args?.location ?? LOCATION_ID),
			fingerprint: 'a1b2c3d4e5',
			kind: id.startsWith('iss_py')
				? 'python'
				: id.startsWith('iss_node')
					? 'node'
					: id.startsWith('iss_java')
						? 'java'
						: id.startsWith('iss_ruby')
							? 'ruby'
							: id.startsWith('iss_generic')
								? 'generic'
								: 'go',
			title: s.title,
			status: id.startsWith('iss_ruby') || id.startsWith('iss_generic')
				? 'resolved'
				: id.startsWith('iss_java')
					? 'muted'
					: 'open',
			count: 1284,
			firstSeen: at(60 * 26),
			lastSeen: at(2),
			samplePod: 'web-12-7d9f8-abcde',
			sampleMessage: s.sample,
			recentEvents: [
				{ pod: 'web-12-7d9f8-abcde', timestamp: at(2), object: '_errorlog/o1.ndjson.zst', offset: 12 },
				{ pod: 'web-12-7d9f8-fghij', timestamp: at(14), object: '_errorlog/o1.ndjson.zst', offset: 88 },
				{ pod: 'web-12-7d9f8-abcde', timestamp: at(31), object: '_errorlog/o2.ndjson.zst', offset: 4 }
			]
		}
		return ok({ issue })
	},
	'error.update': () => ok({}),

	'disk.list': () => list(disks),
	'disk.get': (args) => ok({ ...disks[0], name: args?.name ?? 'data', location: args?.location ?? LOCATION_ID }),
	'disk.create': () => ok({}),
	'disk.update': () => ok({}),
	'disk.delete': () => ok({}),
	'disk.metrics': () => ok({
		usage: metricLine('used', 5368709120),
		size: metricLine('size', 10737418240)
	}),

	'domain.list': () => list(domains),
	'domain.get': (args) => {
		const d = domains.find((x) => x.domain === args?.domain) ?? { ...domains[0], domain: args?.domain ?? 'acme.example.com' }
		return ok({ ...d, location: args?.location ?? LOCATION_ID })
	},
	'domain.create': () => ok({}),
	'domain.delete': () => ok({}),
	'domain.purgeCache': () => ok({}),

	'route.list': () => list(routes),
	'route.get': (args) => {
		const match = routes.find((r) => r.domain === args?.domain && r.path === (args?.path ?? '/'))
		const base = match ?? routes[0]
		return ok({
			...base,
			location: args?.location ?? base.location,
			domain: args?.domain ?? base.domain,
			path: args?.path ?? base.path
		})
	},
	'route.createV2': () => ok({}),
	'route.delete': () => ok({}),

	// The seed location starts configured and live; every other location is
	// "firewall not configured yet" (not-found) until created. A freshly created
	// location starts as { status: 'pending', action: 'create' } and the
	// simulated deployer flips it to 'success' after the first read (see
	// wafConfiguredZone), so the index spinner resolves on its own. waf.set and
	// waf.delete keep the index/create/manage flows coherent within a session.
	'waf.list': () => {
		const items = [{ ...wafZone, location: LOCATION_ID }]
		for (const location of wafConfigured.keys()) {
			items.push(wafConfiguredZone(location, true))
		}
		return ok({ project: 'acme', items })
	},
	'waf.get': (args) => {
		const location = args?.location ?? LOCATION_ID
		if (location === LOCATION_ID) return ok({ ...wafZone, location: LOCATION_ID })
		if (wafConfigured.has(location)) {
			return ok(wafConfiguredZone(location))
		}
		return err('api: waf zone not found')
	},
	'waf.set': (args) => {
		const location = args?.location
		if (location && location !== LOCATION_ID) {
			wafConfigured.set(location, { description: args?.description ?? '', polls: 0 })
		}
		return ok({})
	},
	'waf.metrics': (args) => {
		// Seed zone has activity; session-created zones read empty (shows the "—"
		// no-traffic state on the index).
		const location = args?.location ?? LOCATION_ID
		if (location === LOCATION_ID) return ok(wafMetrics(args?.timeRange))
		return ok({ series: [], total: 0 })
	},
	'waf.limitMetrics': (args) => {
		const location = args?.location ?? LOCATION_ID
		if (location === LOCATION_ID) return ok(wafLimitMetrics(args?.timeRange))
		return ok({ series: [], total: 0 })
	},
	// Mirrors the server's read semantics: newest first, rule/action filters,
	// keyset `before` cursor (id < before), `next` set only when the page is
	// exactly `limit` long.
	'waf.events': (args) => {
		const location = args?.location ?? LOCATION_ID
		if (location !== LOCATION_ID) return ok({ items: [], next: '' })
		let items = wafEventsAll()
		if (args?.ruleId) items = items.filter((e) => e.ruleId === args.ruleId)
		if (args?.action) items = items.filter((e) => e.action === args.action)
		if (args?.before) items = items.filter((e) => e.id < args.before)
		const limit = Math.min(Math.max(Number(args?.limit) || 50, 1), 200)
		const page = items.slice(0, limit)
		return ok({ items: page, next: page.length === limit ? page[page.length - 1].id : '' })
	},
	'waf.delete': (args) => {
		if (args?.location) wafConfigured.delete(args.location)
		return ok({})
	},
	// Dry run per the waf.test contract: expression mode compiles one synthetic
	// log rule {id: 'expression'}; draft mode walks the given rules in priority
	// order (stable) — first matched allow/block terminates, log continues,
	// rules past the terminal report matched but not evaluated. Limits echo
	// mode and report filterMatched + counted (a blocked request is never
	// counted — the WAF runs before the rate limiter). Nothing is stored.
	'waf.test': (args) => {
		const req: WafTestSample = args?.request ?? {}
		const expressionMode = !!args?.expression
		type InRule = { id?: string, expression?: string, action?: string, priority?: number, status?: number, message?: string }
		type InLimit = { id?: string, mode?: string, filter?: string }
		const inputRules: InRule[] = expressionMode
			? [{ id: 'expression', expression: args.expression, action: 'log', priority: 0 }]
			: (args?.rules ?? [])
		const inputLimits: InLimit[] = expressionMode ? [] : (args?.limits ?? [])

		// Evaluation order: stable sort by priority asc, ids defaulting to
		// '#<index>' (never resolved or generated).
		const ordered = inputRules
			.map((r, i) => ({ ...r, id: r.id || `#${i}` }))
			.map((r, i) => ({ r, i }))
			.sort((a, b) => ((a.r.priority ?? 0) - (b.r.priority ?? 0)) || (a.i - b.i))
			.map(({ r }) => r)

		const ruleResults = ordered.map((r) => {
			// The mock can't compile CEL; the only compile error it can honestly
			// simulate is an empty expression. (An empty expression must NOT fall
			// through to wafEvalExpression — empty only means match-everything for
			// limit filters, never for rules.)
			const error = (r.expression ?? '').trim() ? '' : 'compile error: empty expression'
			return {
				id: r.id,
				action: r.action ?? 'log',
				priority: r.priority ?? 0,
				matched: !error && wafEvalExpression(r.expression ?? '', req) === true,
				evaluated: true,
				terminal: false,
				error
			}
		})

		let outcome = 'pass'
		let winningRuleId = ''
		let status = 0
		let message = ''
		for (const [i, rr] of ruleResults.entries()) {
			if (rr.error || !rr.matched) continue
			if (rr.action !== 'allow' && rr.action !== 'block') continue
			rr.terminal = true
			outcome = rr.action
			winningRuleId = rr.id
			if (rr.action === 'block') {
				status = ordered[i].status || 403
				message = ordered[i].message || 'Forbidden'
			}
			for (let j = i + 1; j < ruleResults.length; j++) ruleResults[j].evaluated = false
			break
		}

		const limitResults = inputLimits.map((l, i) => {
			const filter = (l.filter ?? '').trim()
			const filterMatched = !filter || wafEvalExpression(filter, req) === true
			return {
				id: l.id || `#${i}`,
				mode: l.mode === 'shadow' ? 'shadow' : 'enforce',
				filterMatched,
				counted: filterMatched && outcome !== 'block',
				error: ''
			}
		})

		return ok({
			outcome,
			winningRuleId,
			status,
			message,
			rules: ruleResults,
			limits: limitResults,
			valid: ruleResults.every((r) => !r.error)
		})
	},

	// Named IP lists — session-mutable CRUD. Delete refuses while the seed
	// zone still references the list, mirroring the server's in-use guard.
	'wafList.list': () => ok({
		project: 'acme',
		items: [...wafLists.values()]
			.sort((a, b) => a.name.localeCompare(b.name))
			.map(wafListItem)
	}),
	'wafList.get': (args) => {
		const l = wafLists.get(args?.name ?? '')
		if (!l) return err('api: waf list not found')
		return ok(wafListItem(l))
	},
	'wafList.set': (args) => {
		const name = String(args?.name ?? '')
		const existing = wafLists.get(name)
		wafLists.set(name, {
			name,
			description: args?.description ?? '',
			type: 'ip',
			entries: [...(args?.entries ?? [])],
			createdAt: existing?.createdAt ?? new Date().toISOString(),
			createdBy: existing?.createdBy ?? USER_EMAIL,
			updatedAt: new Date().toISOString()
		})
		return ok({})
	},
	'wafList.delete': (args) => {
		const name = String(args?.name ?? '')
		if (!wafLists.has(name)) return err('api: waf list not found')
		const refs = wafListReferencedBy(name)
		if (refs.length > 0) {
			return err(`waf list "${name}" is in use by the waf zone at ${refs.join(', ')} (rules: "Always allow the office IP list")`)
		}
		wafLists.delete(name)
		return ok({})
	},

	// The seed location starts configured and live; every other location is
	// "cache not configured yet" (not-found) until created. A freshly created
	// location starts as { status: 'pending', action: 'create' } and the
	// simulated deployer flips it to 'success' after the first read (see
	// cacheConfiguredZone), so the index spinner resolves on its own. cache.set
	// and cache.delete keep the index/create/manage flows coherent within a
	// session.
	'cache.list': () => {
		const items = [{ ...cacheZone, location: LOCATION_ID }]
		for (const location of cacheConfigured.keys()) {
			items.push(cacheConfiguredZone(location, true))
		}
		return ok({ project: 'acme', items })
	},
	'cache.get': (args) => {
		const location = args?.location ?? LOCATION_ID
		if (location === LOCATION_ID) return ok({ ...cacheZone, location: LOCATION_ID })
		if (cacheConfigured.has(location)) {
			return ok(cacheConfiguredZone(location))
		}
		return err('api: cache zone not found')
	},
	'cache.set': (args) => {
		const location = args?.location
		if (location && location !== LOCATION_ID) {
			cacheConfigured.set(location, { description: args?.description ?? '', polls: 0 })
		}
		return ok({})
	},
	'cache.metrics': (args) => {
		// Seed zone has activity; session-created zones read empty (shows the "—"
		// no-traffic state on the index).
		const location = args?.location ?? LOCATION_ID
		if (location === LOCATION_ID) return ok(cacheMetrics(args?.timeRange))
		return ok({ series: [], total: 0 })
	},
	'cache.resultMetrics': (args) => ok(cacheResultMetrics(args?.timeRange)),
	'cache.delete': (args) => {
		if (args?.location) cacheConfigured.delete(args.location)
		return ok({})
	},

	// The seed location starts configured and live; every other location is
	// "transform not configured yet" (not-found) until created. A freshly created
	// location starts as { status: 'pending', action: 'create' } and the
	// simulated deployer flips it to 'success' after the first read (see
	// transformConfiguredZone), so the index spinner resolves on its own.
	'transform.list': () => {
		const items = [{ ...transformZone, location: LOCATION_ID }]
		for (const location of transformConfigured.keys()) {
			items.push(transformConfiguredZone(location, true))
		}
		return ok({ project: 'acme', items })
	},
	'transform.get': (args) => {
		const location = args?.location ?? LOCATION_ID
		if (location === LOCATION_ID) return ok({ ...transformZone, location: LOCATION_ID })
		if (transformConfigured.has(location)) {
			return ok(transformConfiguredZone(location))
		}
		return err('api: transform zone not found')
	},
	'transform.set': (args) => {
		const location = args?.location
		if (location && location !== LOCATION_ID) {
			transformConfigured.set(location, { description: args?.description ?? '', polls: 0 })
		}
		return ok({})
	},
	'transform.delete': (args) => {
		if (args?.location) transformConfigured.delete(args.location)
		return ok({})
	},

	'pullSecret.list': () => list(pullSecrets),
	'pullSecret.get': (args) => ok({ ...pullSecrets[0], name: args?.name ?? 'dockerhub', location: args?.location ?? LOCATION_ID }),
	'pullSecret.create': () => ok({}),
	'pullSecret.delete': () => ok({}),

	'workloadIdentity.list': () => list(workloadIdentities),
	'workloadIdentity.get': (args) => ok({ ...workloadIdentities[0], name: args?.name ?? 'gcs-reader', location: args?.location ?? LOCATION_ID }),
	'workloadIdentity.create': () => ok({}),
	'workloadIdentity.delete': () => ok({}),

	// envGroup.list returns metadata + envCount only (Api.EnvGroupListItem); the
	// values map lives behind envGroup.get.
	'envGroup.list': () => list(envGroups.map((g) => ({
		project: g.project,
		name: g.name,
		envCount: Object.keys(g.env ?? {}).length,
		createdAt: g.createdAt,
		createdBy: g.createdBy
	}))),
	'envGroup.get': (args) => ok({ ...envGroups[0], name: args?.name ?? 'shared' }),
	'envGroup.create': () => ok({}),
	'envGroup.update': () => ok({}),
	'envGroup.delete': () => ok({}),

	'scheduler.list': () => list(schedulerJobs),
	'scheduler.get': (args) => ok(schedulerJobs.find((j) => j.name === args?.name) ?? { ...schedulerJobs[0], name: args?.name ?? 'daily-health-check' }),
	'scheduler.create': () => ok({}),
	'scheduler.update': () => ok({}),
	'scheduler.delete': () => ok({}),
	'scheduler.pause': () => ok({}),
	'scheduler.resume': () => ok({}),
	'scheduler.trigger': () => ok({ id: '99', startedAt: CREATED_AT, result: 'pending', httpStatus: 0, latencyMs: 0, error: '' }),
	'scheduler.logs': () => list(schedulerInvocations),

	'notification.list': () => list(notificationChannels),
	'notification.get': (args) => ok(notificationChannels.find((c) => c.name === args?.name) ?? { ...notificationChannels[0], name: args?.name ?? 'ops-webhook' }),
	'notification.create': () => ok({}),
	'notification.update': () => ok({}),
	'notification.delete': () => ok({}),
	'notification.test': () => ok({ id: '', startedAt: CREATED_AT, result: 'success', httpStatus: 200, latencyMs: 73, error: '' }),
	'notification.deliveries': () => list(notificationDeliveries),
	'notification.pull': () => ok({ project: 'acme', name: 'local-agent', events: [], cursor: 0, hasMore: false }),

	'email.list': () => list([{ domain: 'mail.acme.example.com', createdAt: CREATED_AT }]),

	'role.list': () => list(roles),
	'role.get': (args) => ok(roles.find((r) => r.role === args?.role) ?? roles[0]),
	'role.create': () => ok({}),
	'role.delete': () => ok({}),
	'role.bind': () => ok({}),
	'role.permissions': () => ok(permissions),
	'role.users': () => list([
		{ email: USER_EMAIL, roles: ['admin'] },
		{ email: 'teammate@acme.example.com', roles: ['viewer'] }
	]),

	'github.getApp': () => ok({ installUrl: 'https://github.com/apps/deploys-app/installations/new' }),
	'github.addInstallation': () => ok({}),
	'github.listInstallations': () => list([
		{ installationId: 77, createdAt: '2026-05-01T08:00:00Z' }
	]),
	'github.listRepos': () => list([
		{ repositoryId: 812345678, repository: 'acme/web', private: false },
		{ repositoryId: 812345679, repository: 'acme/api', private: false },
		{ repositoryId: 812345680, repository: 'acme/docs', private: false },
		{ repositoryId: 812345681, repository: 'acme/mobile', private: true },
		{ repositoryId: 812345682, repository: 'contoso/site', private: false },
		{ repositoryId: 812345683, repository: 'contoso/backend', private: false }
	]),
	'github.list': () => list([...githubLinks]),
	'github.lookupRepo': (args) => {
		const repository = args?.repository ?? ''
		if (repository.startsWith('notinstalled/')) {
			return err('api: github app is not installed on the repository')
		}
		return ok({
			repositoryId: 700000 + repository.length,
			repository,
			installationId: 77
		})
	},
	'github.link': (args) => {
		if (githubLinks.some((l) => l.repositoryId === args?.repositoryId)) {
			return err('api: github repository already linked')
		}
		const sa = serviceAccounts.find((s) => s.sid === args?.serviceAccount)
		githubLinks.push({
			repositoryId: args?.repositoryId,
			repository: args?.repository,
			installationId: args?.installationId ?? 0,
			serviceAccount: args?.serviceAccount,
			serviceAccountEmail: sa?.email ?? `${args?.serviceAccount}@acme.serviceaccount.deploys.app`,
			productionBranch: args?.productionBranch ?? '',
			trigger: args?.trigger ?? 'all',
			createdAt: CREATED_AT,
			createdBy: USER_EMAIL
		})
		return ok({})
	},
	'github.unlink': (args) => {
		const i = githubLinks.findIndex((l) => l.repositoryId === args?.repositoryId)
		if (i < 0) return err('api: github repository link not found')
		githubLinks.splice(i, 1)
		return ok({})
	},
	'github.update': (args) => {
		const l = githubLinks.find((x) => x.repositoryId === args?.repositoryId)
		if (!l) return err('api: github repository link not found')
		const sa = serviceAccounts.find((s) => s.sid === args?.serviceAccount)
		l.serviceAccount = args?.serviceAccount ?? l.serviceAccount
		l.serviceAccountEmail = sa?.email ?? l.serviceAccountEmail
		l.trigger = args?.trigger ?? 'all'
		l.productionBranch = l.trigger === 'pr' ? '' : (args?.productionBranch ?? '')
		return ok({})
	},
	'github.setWorkflowConfig': (args) => {
		const l = githubLinks.find((x) => x.repositoryId === args?.repositoryId)
		if (!l) return err('api: github repository link not found')
		l.workflowConfig = args?.workflowConfig ?? null
		return ok({})
	},
	'serviceAccount.list': () => list(serviceAccounts),
	'serviceAccount.get': (args) => ok({
		...serviceAccounts[0],
		sid: args?.id ?? serviceAccounts[0].sid,
		keys: [{ secret: 'sk_mock_0000000000000000' }]
	}),
	'serviceAccount.create': (args) => {
		const sid = args?.sid ?? 'new-sa'
		const project = args?.project ?? 'acme'
		if (!serviceAccounts.some((s) => s.sid === sid)) {
			serviceAccounts.push({
				sid,
				email: `${sid}@${project}.serviceaccount.deploys.app`,
				name: args?.name ?? sid,
				description: '',
				createdAt: CREATED_AT,
				createdBy: USER_EMAIL
			})
		}
		return ok({})
	},
	'serviceAccount.update': () => ok({}),
	'serviceAccount.createKey': () => ok({}),
	'serviceAccount.delete': () => ok({}),
	'serviceAccount.deleteKey': () => ok({}),

	'dropbox.list': () => list(dropboxItems),
	'dropbox.metrics': () => ok({
		egress: dailyMetricLine('egress', 52428800),
		storage: dailyMetricLine('storage', 268435456)
	}),
	'registry.metrics': () => ok({
		egress: dailyMetricLine('egress', 104857600),
		storage: dailyMetricLine('storage', 1073741824)
	}),

	'registry.list': () => list(repositories),
	'registry.get': (args) => ok({ ...repositories[0], name: args?.repository ?? repositories[0].name }),
	'registry.getProjectStorage': () => ok({ size: 276480000, updatedAt: CREATED_AT }),
	'registry.getTags': (args) => ok({ name: args?.repository ?? repositories[0].name, items: repositoryTags }),
	'registry.getManifests': (args) => ok({ name: args?.repository ?? repositories[0].name, items: repositoryManifests }),
	'registry.delete': () => ok({}),
	'registry.deleteManifest': () => ok({}),
	'registry.untag': () => ok({}),
	'registry.gc': (args) => ok({
		dryRun: !!args?.dryRun,
		removedManifests: 3,
		removedTags: 2,
		reclaimedSize: 61440000,
		repositories: [
			{ repository: 'acme/web', manifests: ['sha256:aaaa', 'sha256:bbbb'], tags: ['old-staging'], size: 40960000 },
			{ repository: 'acme/worker', manifests: ['sha256:cccc'], tags: ['v0.9.0'], size: 20480000 }
		]
	})
}

/**
 * Resolve a mock response for an API function. Unknown functions return an
 * empty-but-ok payload so list/get callers degrade gracefully.
 */
export function mockInvoke (fn: string, args: object = {}): object {
	const handler = handlers[fn]
	if (!handler) {
		console.warn(`[mock] no fixture for "${fn}" — returning empty ok response`)
		return ok({})
	}
	return handler(args)
}
