export interface Error {
	message: string
	items?: string[]

	// inject by invoke
	unauth?: boolean
	forbidden?: boolean
	notFound?: boolean
	validate?: string[]
}

export type ApiResponse<T> =
	| { ok: true; result: T; error?: never }
	| { ok: false; error: Error; result?: never }

export interface Profile {
	email: string
}

export interface List<T> {
	items: T[]
}

export interface ProjectQuota {
	deployments: number
	deploymentMaxReplicas: number
}

export interface ProjectConfig {
	domainAllowDisableCdn: boolean
}

export interface Project {
	id: string
	project: string
	name: string
	billingAccount: string
	quota: ProjectQuota
	config: ProjectConfig
	createdAt: string
}

export interface BillingAccount {
	id: string
	name: string
	taxId: string
	taxName: string
	taxAddress: string
	active: boolean
}

export interface ProjectUsage {
	cpuUsage: number
	cpu: number
	memory: number
	egress: number
	disk: number
	replica: number
}

export interface BillingProject {
	price: number
}

export interface PodStatus {
	count: number
	ready: number
	failed: number
}

export interface RouteConfig {
	basicAuth?: {
		user: string
		password: string
	}
	forwardAuth?: {
		target: string
		authRequestHeaders: string[]
		authResponseHeaders: string[]
	}
}

export interface Route {
	location: string
	domain: string
	path: string
	target: string
	deployment: string
	config: RouteConfig
	createdAt: string
	createdBy: string
}

export interface Location {
	id: string
	domainSuffix: string
	endpoint: string
	cname: string
	cpuAllocatable: string[]
	memoryAllocatable: string[]
	features: {
		workloadIdentity?: boolean
		disk?: Record<string, never>
	}
	createdAt: string
}

export interface Domain {
	project: string
	location: string
	domain: string
	wildcard: boolean
	cdn: boolean
	verification: {
		ownership: {
			type: string
			name: string
			value: string
			errors: string[]
		}
		ssl: {
			pending: boolean
			dcv: {
				name: string
				value: string
			}
			records: {
				txtName: string
				txtValue: string
			}[]
			errors: string[]
		}
	},
	dnsConfig: {
		ipv4: string[]
		ipv6: string[]
		cname: string[]
	}
	status: 'pending' | 'success' | 'error' | 'verify'
	createdAt: string
	createdBy: string
}

export interface PullSecretSpec {
	server: string
	username: string
	password: string
}

export interface PullSecret {
	name: string
	value: string
	spec: PullSecretSpec
	location: string
	action: 'create' | 'delete',
	status: 'pending' | 'success' | 'error'
	createdAt: string
	createdBy: string
}

export interface WorkloadIdentity {
	project: string
	location: string
	name: string
	gsa: string
	status: 'pending' | 'success' | 'error'
	createdAt: string
	createdBy: string
}

export interface Disk {
	project: string
	location: string
	name: string
	size: number
	status: 'pending' | 'success' | 'error'
	action: 'create' | 'delete'
	createdAt: string
	createdBy: string
	successAt: string
}

export interface Role {
	role: string
	name: string
	permissions: string[]
	createdAt: string
	createdBy: string
}

export interface Env {
	[key: string]: string
}

export interface MountData {
	[key: string]: string
}

export interface Annotations {
	[key: string]: string
}

export interface DeploymentDisk {
	name: string
	mountPath: string
	subPath: string
}

export enum DeploymentProtocol {
	// eslint-disable-next-line no-unused-vars
	HTTP = 'http',
	// eslint-disable-next-line no-unused-vars
	HTTPS = 'https',
	// eslint-disable-next-line no-unused-vars
	H2C = 'h2c'
}

export interface Resource {
	// cpu: string
	memory: string
}

export interface DeploymentResource {
	requests: Resource
	limits: Resource
}

export interface Sidecar {
	cloudSqlProxy?: {
		instance: string
		port: number
		credentials: string
	}
}

export interface Deployment {
	project: string
	location: string
	name: string
	type: string
	revision: number
	image: string
	env: Env
	command: string[]
	args: string[]
	workloadIdentity: string
	pullSecret: string
	disk?: DeploymentDisk
	mountData: MountData
	minReplicas: number
	maxReplicas: number
	schedule: string
	port: number
	protocol: DeploymentProtocol
	internal: boolean
	nodePort: number
	annotations: Annotations
	resources: DeploymentResource
	sidecars: Sidecar[]
	url: string
	internalUrl: string
	logUrl: string
	eventUrl: string
	podsUrl: string
	statusUrl: string
	address: string
	internalAddress: string
	status: 'pending' | 'success' | 'error'
	action: 'deploy' | 'delete' | 'pause'
	allocatedPrice: number
	createdAt: string
	createdBy: string
	successAt: string
}

export {}
