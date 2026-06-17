/**
 * Per-target-prefix UI metadata for route targets, shared by the route
 * list/manage and create/edit pages so the label/icon/placeholder/hint for each
 * `<prefix>://` target type live in one place.
 */
export interface RouteTargetMeta {
	label: string
	icon: string // Font Awesome class
	placeholder?: string
	hint?: string
}

export const routeTargetMeta: Record<string, RouteTargetMeta> = {
	'deployment://': { label: 'Deployment', icon: 'fa-cube' },
	'redirect://': { label: 'Redirect', icon: 'fa-arrow-right-arrow-left', placeholder: 'https://example.com' },
	'http://': {
		label: 'External server (HTTP)',
		icon: 'fa-server',
		placeholder: '203.0.113.10:8080',
		hint: 'Your server’s public IP address, with an optional port (defaults to 80). Private, loopback, and link-local addresses are not allowed.'
	},
	'ipfs://': { label: 'IPFS', icon: 'fa-cubes' },
	'ipns://': { label: 'IPNS', icon: 'fa-cubes' },
	'dnslink://': { label: 'DNSLink', icon: 'fa-link' }
}
