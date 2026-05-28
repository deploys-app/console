/**
 * Project-scoped navigation menu.
 *
 * Single source of truth shared by the sidebar (`Sidebar.svelte`) and the
 * global search palette (`lib/search`) so the two never drift apart.
 *
 * @typedef {Object} ProjectMenuItem
 * @property {string} id
 * @property {string} title
 * @property {string} icon     Font Awesome class, e.g. `fa-rocket`
 * @property {string} link     route path, without the `?project=` query
 * @property {boolean} [preview]
 */

/** @type {ProjectMenuItem[]} */
export const projectMenu = [
	{ id: 'dashboard', title: 'Dashboard', icon: 'fa-columns', link: '/' },
	{ id: 'deployment', title: 'Deployments', icon: 'fa-rocket', link: '/deployment' },
	{ id: 'domain', title: 'Domains', icon: 'fa-globe', link: '/domain' },
	{ id: 'route', title: 'Routes', icon: 'fa-router', link: '/route' },
	{ id: 'waf', title: 'Firewall', icon: 'fa-shield-halved', link: '/waf', preview: true },
	{ id: 'workload-identity', title: 'Workload Identities', icon: 'fa-network-wired', link: '/workload-identity' },
	{ id: 'disk', title: 'Disks', icon: 'fa-hdd', link: '/disk' },
	{ id: 'pull-secret', title: 'Pull Secrets', icon: 'fa-key', link: '/pull-secret' },
	{ id: 'env-group', title: 'Env Groups', icon: 'fa-cog', link: '/env-group' },
	{ id: 'role', title: 'Roles', icon: 'fa-user-tag', link: '/role' },
	{ id: 'role.users', title: 'Users', icon: 'fa-users', link: '/role/users' },
	{ id: 'service-account', title: 'Service Accounts', icon: 'fa-user-lock', link: '/service-account' },
	{ id: 'dropbox', title: 'Dropbox', icon: 'fa-box-open', link: '/dropbox' },
	{ id: 'registry', title: 'Registry', icon: 'fa-warehouse-full', link: '/registry' },
	{ id: 'audit-log', title: 'Audit Logs', icon: 'fa-clipboard-list', link: '/audit-log' }
]
