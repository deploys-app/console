// Static fixture responses for the dev frontend, enabled via MOCK_API.
// Wired into the API proxies (src/routes/api/[fn]/+server.js and
// src/routes/api/registry/[fn]/+server.js) so the console can run fully
// offline without the real api.deploys.app backend or an OAuth token.

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

/**
 * @template T
 * @param {T} [result]
 * @returns {{ ok: true, result: T }}
 */
const ok = (result = /** @type {T} */ ({})) => ({ ok: true, result })

/**
 * @param {string} message
 * @returns {{ ok: false, error: { message: string } }}
 */
const err = (message) => ({ ok: false, error: { message } })

/**
 * @template T
 * @param {T[]} items
 */
const list = (items) => ok({ items })

/**
 * Synthesize a metric line: a single named series of [unixSeconds, value] points.
 * @param {string} name
 * @param {number} base
 */
function metricLine (name, base) {
	const now = Math.floor(Date.now() / 1000)
	const points = Array.from({ length: 30 }, (_, i) => {
		const wobble = Math.sin(i / 3) * base * 0.25
		return [now - (29 - i) * 120, Math.max(0, Math.round((base + wobble) * 100) / 100)]
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
		config: { domainAllowDisableCdn: true },
		createdAt: CREATED_AT
	},
	{
		id: 'prj_mock_staging',
		project: 'staging',
		name: 'Staging',
		billingAccount: 'ba_mock_1',
		quota: { deployments: 20, deploymentMaxReplicas: 5 },
		config: { domainAllowDisableCdn: false },
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
		features: { workloadIdentity: true, disk: {}, waf: {} },
		createdAt: CREATED_AT
	},
	{
		id: 'gke.cluster-sg1',
		domainSuffix: 'sg1.deploys.app',
		endpoint: 'https://sg1.deploys.app',
		cname: 'sg1.deploys.app.',
		cpuAllocatable: ['100m', '250m', '500m', '1000m', '2000m'],
		memoryAllocatable: ['128Mi', '256Mi', '512Mi', '1Gi', '2Gi'],
		features: { workloadIdentity: true, disk: {}, waf: {} },
		createdAt: CREATED_AT
	}
]

const billingAccounts = [
	{
		id: 'ba_mock_1',
		name: 'Acme Billing',
		taxId: '0123456789012',
		taxName: 'Acme Co., Ltd.',
		taxAddress: '1 Mockingbird Lane, Bangkok 10110',
		active: true
	}
]

/** @param {string} [project] */
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
		command: [],
		args: [],
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
		url: 'https://web.acme.rcf2.deploys.app',
		internalUrl: 'http://web.acme.svc.cluster.local',
		logUrl: '',
		eventUrl: '',
		podsUrl: '',
		statusUrl: HEALTHY_STATUS_URL,
		address: '203.0.113.10',
		internalAddress: '10.0.0.10',
		status: 'success',
		action: 'deploy',
		allocatedPrice: 120.5,
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL,
		successAt: CREATED_AT,
		ttl: 0
	}
}

const deployments = [
	deployment('acme'),
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
		cdn: true,
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
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL
	}
]

const routes = [
	{
		location: LOCATION_ID,
		domain: 'acme.example.com',
		path: '/',
		target: 'web',
		deployment: 'web',
		config: {},
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL
	}
]

const wafZone = {
	project: 'acme',
	location: LOCATION_ID,
	description: 'Block admin paths and noisy bots',
	rules: [
		{
			id: 'block-admin',
			description: 'Block external access to /admin',
			expression: "request.path.startsWith('/admin')",
			action: 'block',
			status: 403,
			message: 'Forbidden',
			priority: 10
		},
		{
			id: 'log-bots',
			description: 'Log suspected bot traffic',
			expression: "request.headers['user-agent'].contains('bot')",
			action: 'log',
			priority: 20
		}
	],
	status: 'success',
	action: 'create',
	createdAt: CREATED_AT,
	createdBy: USER_EMAIL
}

// Synthetic 24h match metrics for the seed zone, so the firewall index sparkline
// + total have something to draw. Scatters per-minute counts across the window
// per (rule, action), mirroring waf.metrics' shape (sparse buckets, grand total).
function wafMetrics () {
	const now = Math.floor(Date.now() / 1000)
	const minute = 60

	/**
	 * @param {string} ruleId
	 * @param {Api.WafAction} action
	 * @param {number} buckets  // how many active minutes
	 * @param {number} scale    // max count per minute
	 */
	const makeSeries = (ruleId, action, buckets, scale) => {
		/** @type {[number, number][]} */
		const points = []
		let total = 0
		for (let i = 0; i < buckets; i++) {
			const ts = now - Math.floor(Math.random() * 24 * 60) * minute
			const v = 1 + Math.floor(Math.random() * scale)
			points.push([ts, v])
			total += v
		}
		points.sort((a, b) => a[0] - b[0])
		return { ruleId, action, total, points }
	}

	const series = [
		makeSeries('block-admin', 'block', 36, 6),
		makeSeries('log-bots', 'log', 80, 3)
	]
	const total = series.reduce((acc, s) => acc + s.total, 0)
	return { series, total }
}

// Locations (besides the seed LOCATION_ID) that have had a firewall created in
// this dev session, mapped to { description, polls }. `polls` counts how many
// times the zone has been read while pending; the deployer is simulated by
// flipping the zone from pending → success after the first poll, so the index
// spinner visibly resolves on its own. Lets create → manage flow work too.
/** @type {Map<string, { description: string, polls: number }>} */
const wafConfigured = new Map()

/**
 * Build a WAF zone for a session-created location. `advance` simulates the
 * deployer: it's set on waf.list reads (the index poll) so the first list shows
 * pending/create and the next list — after the page polls — settles to success,
 * making the spinner resolve on its own. waf.get reads observe the same state
 * without advancing it.
 * @param {string} location
 * @param {boolean} [advance]
 */
function wafConfiguredZone (location, advance = false) {
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

const serviceAccounts = [
	{
		sid: 'sa_mock_ci',
		email: 'ci@acme.deploys.app',
		name: 'CI Deployer',
		description: 'Used by CI to deploy services',
		createdAt: CREATED_AT,
		createdBy: USER_EMAIL
	}
]

const auditLogItems = [
	{
		id: 1042,
		resource: { type: 'Deployment', id: 'web', name: 'web', locationId: LOCATION_ID },
		actor: { email: USER_EMAIL, type: 'User' },
		action: 'deployment.deploy',
		outcome: 'success',
		detail: 'Deployed revision 7',
		createdAt: CREATED_AT
	},
	{
		id: 1041,
		resource: { type: 'Domain', id: 'acme.example.com', name: 'acme.example.com', locationId: LOCATION_ID },
		actor: { email: USER_EMAIL, type: 'User' },
		action: 'domain.create',
		outcome: 'success',
		detail: 'Added domain acme.example.com',
		createdAt: CREATED_AT
	}
]

const repositories = [
	{ name: 'acme/web', size: 184320000, createdAt: CREATED_AT },
	{ name: 'acme/worker', size: 92160000, createdAt: CREATED_AT }
]

const repositoryTags = [
	{ tag: 'latest', digest: 'sha256:1111111111111111111111111111111111111111111111111111111111111111', createdAt: CREATED_AT },
	{ tag: 'v1.2.0', digest: 'sha256:2222222222222222222222222222222222222222222222222222222222222222', createdAt: CREATED_AT }
]

const repositoryManifests = [
	{ digest: 'sha256:1111111111111111111111111111111111111111111111111111111111111111', createdAt: CREATED_AT },
	{ digest: 'sha256:2222222222222222222222222222222222222222222222222222222222222222', createdAt: CREATED_AT }
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
			{ sku: 'cpu', description: 'vCPU-hours', quantity: 600, unit: 'hour', unitPrice: 1.5, amount: 900 },
			{ sku: 'mem', description: 'GiB-hours', quantity: 600, unit: 'hour', unitPrice: 0.5, amount: 300 }
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
			{ sku: 'cpu', description: 'vCPU-hours', quantity: 100, unit: 'hour', unitPrice: 1.5, amount: 150 }
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
			{ sku: 'cpu', description: 'vCPU-hours', quantity: 720, unit: 'hour', unitPrice: 1.5, amount: 1080 },
			{ sku: 'mem', description: 'GiB-hours', quantity: 720, unit: 'hour', unitPrice: 0.583, amount: 420 }
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
			{ sku: 'cpu', description: 'vCPU-hours', quantity: 720, unit: 'hour', unitPrice: 1.5, amount: 1080 }
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
			{ sku: 'cpu', description: 'vCPU-hours', quantity: 200, unit: 'hour', unitPrice: 0.04, amount: 8 },
			{ sku: 'mem', description: 'GiB-hours', quantity: 200, unit: 'hour', unitPrice: 0.016, amount: 3.2 }
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
			{ sku: 'cpu', description: 'vCPU-hours', quantity: 50, unit: 'hour', unitPrice: 1.5, amount: 75 }
		]
	}
]

/** @param {(typeof invoices)[number]} inv */
function invoiceListItem (inv) {
	return {
		id: inv.id,
		number: inv.number,
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

/** @type {Record<string, (args: any) => object>} */
const handlers = {
	'me.get': () => ok({ email: USER_EMAIL }),

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
		registryEgress: 268435456,
		dropboxEgress: 134217728,
		disk: 10737418240,
		replica: 4,
		domainCdn: 2
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
	'billing.getInvoice': (args) => ok(invoices.find((i) => i.id === args?.invoiceId) ?? invoices[0]),
	'billing.downloadInvoice': (args) => {
		const inv = invoices.find((i) => i.id === args?.invoiceId) ?? invoices[0]
		return ok({
			downloadUrl: `https://dropbox.deploys.app/files/mock-${inv.id}.pdf`,
			expiresAt: '2026-06-02T00:00:00Z'
		})
	},
	// Multipart upload: the proxy can't JSON-parse the body in mock mode, so
	// args is empty here — just acknowledge the upload.
	'billing.uploadTransferSlip': () => ok({
		downloadUrl: 'https://dropbox.deploys.app/files/mock-slip.jpg',
		expiresAt: '2026-06-02T00:00:00Z'
	}),

	'auditLog.list': (args) => list(auditLogItems.slice(0, args?.limit ?? auditLogItems.length)),

	'location.list': () => list(locations),
	'location.get': (args) => ok(locations.find((l) => l.id === args?.location) ?? locations[0]),

	'deployment.list': () => list(deployments),
	'deployment.get': (args) => ok({ ...deployment(args?.project), name: args?.name ?? 'web', location: args?.location ?? LOCATION_ID }),
	'deployment.deploy': () => ok({}),
	'deployment.delete': () => ok({}),
	'deployment.pause': () => ok({}),
	'deployment.resume': () => ok({}),
	'deployment.rollback': () => ok({}),
	'deployment.revisions': (args) => list([7, 6, 5].map((revision) => ({
		...deployment(args?.project),
		name: args?.name ?? 'web',
		location: args?.location ?? LOCATION_ID,
		revision
	}))),
	'deployment.metrics': () => ok({
		cpuUsage: metricLine('web', 0.3),
		cpuLimit: metricLine('limit', 0.5),
		memoryUsage: metricLine('web', 268435456),
		memory: metricLine('allocated', 402653184),
		memoryLimit: metricLine('limit', 536870912),
		requests: metricLine('web', 120),
		egress: metricLine('web', 1048576)
	}),

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
	'domain.get': (args) => ok({ ...domains[0], domain: args?.domain ?? 'acme.example.com', location: args?.location ?? LOCATION_ID }),
	'domain.create': () => ok({}),
	'domain.delete': () => ok({}),
	'domain.purgeCache': () => ok({}),

	'route.list': () => list(routes),
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
		if (location === LOCATION_ID) return ok(wafMetrics())
		return ok({ series: [], total: 0 })
	},
	'waf.delete': (args) => {
		if (args?.location) wafConfigured.delete(args.location)
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

	'envGroup.list': () => list(envGroups),
	'envGroup.get': (args) => ok({ ...envGroups[0], name: args?.name ?? 'shared' }),
	'envGroup.create': () => ok({}),
	'envGroup.update': () => ok({}),
	'envGroup.delete': () => ok({}),

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

	'serviceAccount.list': () => list(serviceAccounts),
	'serviceAccount.get': (args) => ok({
		...serviceAccounts[0],
		sid: args?.id ?? serviceAccounts[0].sid,
		keys: [{ secret: 'sk_mock_0000000000000000' }]
	}),
	'serviceAccount.create': () => ok({}),
	'serviceAccount.update': () => ok({}),
	'serviceAccount.createKey': () => ok({}),
	'serviceAccount.delete': () => ok({}),
	'serviceAccount.deleteKey': () => ok({}),

	'dropbox.list': () => list(dropboxItems),

	'registry/list': () => list(repositories),
	'registry/get': (args) => ok({ ...repositories[0], name: args?.repository ?? repositories[0].name }),
	'registry/getProjectStorage': () => ok({ size: 276480000, updatedAt: CREATED_AT }),
	'registry/getTags': (args) => ok({ name: args?.repository ?? repositories[0].name, items: repositoryTags }),
	'registry/getManifests': (args) => ok({ name: args?.repository ?? repositories[0].name, items: repositoryManifests }),
	'registry/delete': () => ok({}),
	'registry/deleteManifest': () => ok({}),
	'registry/untag': () => ok({})
}

/**
 * Resolve a mock response for an API function. Unknown functions return an
 * empty-but-ok payload so list/get callers degrade gracefully.
 * @param {string} fn
 * @param {object} [args]
 * @returns {object}
 */
export function mockInvoke (fn, args = {}) {
	const handler = handlers[fn]
	if (!handler) {
		console.warn(`[mock] no fixture for "${fn}" — returning empty ok response`)
		return ok({})
	}
	return handler(args)
}
