/**
 * Default mock responses used by tests.
 * Each test can call `setMocks` with overrides to customize a single run.
 *
 * The HTTP mock server (see `tests/mock-server.js`) serves these as the
 * upstream API_ENDPOINT. Both SSR loads (server-side fetch from inside the
 * SvelteKit Node process) and client-side fetch calls flow through the
 * `/api/[fn]` proxy and ultimately hit this mock.
 */

const now = '2024-01-01T00:00:00Z'

export const defaultProfile = {
	email: '[email protected]'
}

export const defaultProject = {
	id: '1',
	project: 'test-project',
	name: 'Test Project',
	billingAccount: 'ba-1',
	quota: { deployments: 10, deploymentMaxReplicas: 5 },
	config: { domainAllowDisableCdn: true },
	createdAt: now
}

export const defaultLocation = {
	id: 'gke',
	domainSuffix: 'app.in.th',
	endpoint: 'https://gke.deploys.app',
	cname: 'gke.deploys.app',
	cpuAllocatable: ['0.1', '0.25', '0.5', '1'],
	memoryAllocatable: ['128Mi', '256Mi', '512Mi', '1Gi'],
	features: { workloadIdentity: true, disk: {} },
	createdAt: now
}

export function defaultMocks () {
	return {
		'/me.get': {
			ok: true,
			result: defaultProfile
		},
		// Permission probe — default to authorized so affordances are enabled.
		// me.authorized is a logical AND over the listed permissions; tests that
		// need a denied state override per-request (e.g. via page.route).
		'/me.authorized': {
			ok: true,
			result: { authorized: true }
		},
		// Effective grants used by the (project) layout to drive GuardedButton.
		// Default to the '*' wildcard (full access) so action buttons render
		// enabled; tests that need a denied state override with a restricted set.
		'/me.permissions': {
			ok: true,
			result: { permissions: ['*'], admin: false }
		},
		'/project.list': {
			ok: true,
			result: { items: [defaultProject] }
		},
		'/project.get': {
			ok: true,
			result: defaultProject
		},
		'/project.usage': {
			ok: true,
			result: {
				cpuUsage: 0.1,
				cpu: 1,
				memory: 1073741824,
				egress: 0,
				disk: 0,
				replica: 1
			}
		},
		'/billing.project': {
			ok: true,
			result: { price: 0 }
		},
		'/location.list': {
			ok: true,
			result: { items: [defaultLocation] }
		},
		'/billing.list': {
			ok: true,
			result: { items: [] }
		},
		'/deployment.list': {
			ok: true,
			result: { items: [] }
		},
		'/domain.list': {
			ok: true,
			result: { items: [] }
		},
		'/disk.list': {
			ok: true,
			result: { items: [] }
		},
		'/route.list': {
			ok: true,
			result: { items: [] }
		},
		'/pullSecret.list': {
			ok: true,
			result: { items: [] }
		},
		'/workloadIdentity.list': {
			ok: true,
			result: { items: [] }
		},
		'/serviceAccount.list': {
			ok: true,
			result: { items: [] }
		},
		'/me.listTokens': {
			ok: true,
			result: { items: [] }
		},
		'/me.revokeToken': {
			ok: true,
			result: {}
		},
		'/role.list': {
			ok: true,
			result: { items: [] }
		},
		'/email.list': {
			ok: true,
			result: { items: [] }
		},
		'/envGroup.list': {
			ok: true,
			result: { items: [] }
		},
		'/registry.list': {
			ok: true,
			result: { items: [] }
		},
		'/registry.getProjectStorage': {
			ok: true,
			result: { size: 0 }
		},
		'/auditLog.list': {
			ok: true,
			result: { items: [] }
		},
		'/dropbox.list': {
			ok: true,
			result: { items: [] }
		}
	}
}

export const sampleDeployment = {
	project: 'test-project',
	location: 'gke',
	name: 'web',
	type: 'WebService',
	revision: 1,
	image: 'nginx:latest',
	env: {},
	envGroups: [],
	command: [],
	args: [],
	workloadIdentity: '',
	pullSecret: '',
	mountData: {},
	minReplicas: 1,
	maxReplicas: 3,
	schedule: '',
	port: 80,
	protocol: 'http',
	internal: false,
	nodePort: 0,
	annotations: {},
	resources: {
		requests: { cpu: '100m', memory: '128Mi' },
		limits: { cpu: '500m', memory: '512Mi' }
	},
	sidecars: [],
	url: 'https://web.test-project.app.in.th',
	internalUrl: '',
	logUrl: '',
	eventUrl: '',
	podsUrl: '',
	statusUrl: '',
	address: '',
	internalAddress: '',
	status: 'success',
	action: 'deploy',
	allocatedPrice: 0,
	createdAt: now,
	createdBy: '[email protected]',
	successAt: now,
	ttl: 0
}

export const sampleCloudSqlProxySidecar = {
	cloudSqlProxy: {
		instance: 'my-project:us-central1:my-db',
		port: 3306,
		credentials: ''
	}
}

// A Static (bucket-native static web) deployment: no container image/port — it
// references a content-addressed release via `site` (site://…@<release-sha>) and
// `siteManifestDigest`.
export const sampleStaticReleaseSha =
	'a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00'

export const sampleStaticDeployment = {
	...sampleDeployment,
	name: 'website',
	type: 'Static',
	image: '',
	site: `site://deploys-static/test-project/website@${sampleStaticReleaseSha}`,
	siteManifestDigest: sampleStaticReleaseSha,
	command: [],
	args: [],
	minReplicas: 0,
	maxReplicas: 0,
	port: 0,
	protocol: '',
	url: 'website.test-project.app.in.th',
	internalUrl: ''
}

export const sampleDomain = {
	project: 'test-project',
	location: 'gke',
	domain: 'example.com',
	wildcard: false,
	cdn: true,
	verification: {
		ownership: { type: 'txt', name: '_ownership.example.com', value: 'abcd', errors: [] },
		ssl: { pending: false, dcv: { name: '', value: '' }, records: [], errors: [] }
	},
	dnsConfig: { ipv4: ['1.2.3.4'], ipv6: [], cname: [] },
	status: 'success',
	createdAt: now,
	createdBy: '[email protected]'
}

export const sampleDisk = {
	project: 'test-project',
	location: 'gke',
	name: 'data',
	size: 10,
	status: 'success',
	action: 'create',
	createdAt: now,
	createdBy: '[email protected]',
	successAt: now
}

export const sampleRoute = {
	location: 'gke',
	domain: 'example.com',
	path: '/',
	target: 'deployment://web',
	deployment: 'web',
	config: {},
	createdAt: now,
	createdBy: '[email protected]'
}

export const samplePullSecret = {
	name: 'gcr',
	value: '',
	spec: { server: 'gcr.io', username: '_json_key', password: '...' },
	location: 'gke',
	action: 'create',
	status: 'success',
	createdAt: now,
	createdBy: '[email protected]'
}

export const sampleServiceAccount = {
	sid: 'sa-1',
	email: '[email protected]',
	name: 'CI bot',
	description: 'used by ci',
	createdAt: now,
	createdBy: '[email protected]'
}

export const sampleScopedToken = {
	id: 'tok_test123',
	label: 'claude-code:pr-42',
	permissions: ['deployment.get', 'deployment.logs'],
	createdAt: now,
	expiresAt: '2099-01-01T00:00:00Z'
}

export const sampleRole = {
	role: 'developer',
	name: 'Developer',
	permissions: ['deployment.list', 'deployment.get'],
	createdAt: now,
	createdBy: '[email protected]'
}

export const sampleWorkloadIdentity = {
	project: 'test-project',
	location: 'gke',
	name: 'gsa-binding',
	gsa: '[email protected]',
	status: 'success',
	createdAt: now,
	createdBy: '[email protected]'
}

export const sampleEnvGroup = {
	project: 'test-project',
	name: 'shared-config',
	// envCount is the list projection's count (EnvGroupListItem); env is the full
	// values map returned by envGroup.get. Both are kept on the shared fixture so
	// it serves list (count pill) and get (values) without two fixtures.
	envCount: 2,
	env: {
		LOG_LEVEL: 'info',
		FEATURE_FLAG: 'true'
	},
	createdAt: now,
	createdBy: '[email protected]'
}

export const sampleEmailDomain = {
	domain: 'mail.example.com',
	createdAt: now
}

export const sampleBillingAccount = {
	id: 'ba-1',
	name: 'Personal',
	taxId: '',
	taxName: '',
	taxAddress: '',
	active: true
}

export const sampleInvoice = {
	id: 'inv-1',
	billingAccountId: 'ba-1',
	number: 'INV-2024-001',
	currency: 'USD',
	periodStart: '2024-01-01T00:00:00Z',
	periodEnd: '2024-02-01T00:00:00Z',
	subtotal: 10,
	taxRate: 0.07,
	taxAmount: 0.7,
	total: 10.7,
	status: 'open',
	taxId: '',
	taxName: 'Acme Co',
	taxAddress: '',
	issuedAt: now,
	paidAt: '0001-01-01T00:00:00Z',
	voidedAt: '0001-01-01T00:00:00Z',
	createdAt: now,
	// Invoices group by project: one summary line per project, amount is the
	// project's gross (VAT-inclusive) total. projectId is numeric (int64 wire
	// contract); project is the sid, description the display name.
	lineItems: [
		{ projectId: '1001', project: 'web-frontend', description: 'Web frontend', amount: 9 },
		{ projectId: '1002', project: 'api-service', description: 'API service', amount: 1.7 }
	],
	// Seller settlement details (placeholder demo values, not the real account).
	payment: {
		bank: 'Test Bank',
		accountName: 'Demo Seller Co., Ltd.',
		accountNo: '1234567890',
		promptPay: '0812345678'
	}
}

export const sampleRepository = {
	name: 'web',
	size: 12345678,
	manifests: 4,
	tags: 6,
	createdAt: now
}

export const sampleDropboxItem = {
	downloadUrl: 'https://dropbox.deploys.app/files/abc123',
	filename: 'report.pdf',
	size: 2048,
	ttl: 1,
	createdAt: now,
	expiresAt: '2024-01-02T00:00:00Z'
}

export const sampleAuditLogItem = {
	id: 1,
	resource: {
		type: 'deployment',
		id: 'd-1',
		name: 'web',
		locationId: 'gke'
	},
	actor: {
		email: '[email protected]',
		type: 'User'
	},
	action: 'deployment.deploy',
	outcome: 'success',
	detail: 'deployed revision 1',
	createdAt: now
}

// An action made through a scoped (agent) token: the principal is still the
// minter; the agent session is named by actor.label.
export const sampleAuditLogItemAgent = {
	id: 2,
	resource: {
		type: 'deployment',
		id: 'd-2',
		name: 'web',
		locationId: 'gke'
	},
	actor: {
		email: '[email protected]',
		type: 'User',
		label: 'claude-code:pr-42'
	},
	channel: 'mcp',
	action: 'deployment.deploy',
	outcome: 'success',
	detail: 'deployed revision 2',
	createdAt: now
}

