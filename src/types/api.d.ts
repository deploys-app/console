export interface Error {
	message: string
	items?: string[]

	// inject by invoke
	unauth?: boolean
	forbidden?: boolean
	notFound?: boolean
	validate?: string[]
}

export interface ApiResponse<T> {
	ok: boolean
	error?: Error
	result?: T
}

export interface Profile {
	email: string
}

export interface List<T> {
	items: T[]
}

export interface ProjectItem {
	id: string
	project: string
	name: string
	billingAccount: string
	quota: ProjectQuota
	config: ProjectConfig
	createdAt: string
}

export interface ProjectQuota {
	deployments: number
	deploymentMaxReplicas: number
}

export interface ProjectConfig {
	domainAllowDisableCdn: boolean
	domainWildcard: boolean
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

export interface RouteConfig {
	forwardAuth?: {
		target: string
		authRequestHeaders: string[]
		authResponseHeaders: string[]
	}
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
		disk?: {}
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
			records: {
				txtName: string
				txtValue: string
			}[]
			errors: string[]
		}
	},
	status: 'pending' | 'success' | 'error' | 'verify'
	createdAt: string
	createdBy: string
}

export {}
