import api from '$lib/api'
import { projectMenu } from '$lib/nav'

/**
 * A single searchable item shown in the command palette.
 *
 * @typedef {Object} SearchEntry
 * @property {string} id        stable key, unique across all entries
 * @property {string} group     section heading, e.g. "Deployments" / "Go to"
 * @property {string} icon      Font Awesome class, e.g. `fa-rocket`
 * @property {string} label     primary text (the thing you'd type)
 * @property {string} [sublabel] secondary text (location, target, …)
 * @property {string} href      navigation target
 */

const enc = encodeURIComponent

/**
 * Resource sources fanned out on open. Each calls a project-scoped `*.list`
 * endpoint and maps every item to a {@link SearchEntry}. Keep the labels to the
 * fields a user would actually type to find the resource.
 *
 * @typedef {Object} ResourceSource
 * @property {string} group
 * @property {string} icon
 * @property {string} fn                          api function name
 * @property {(it: any, project: string) => { key: string, label: string, sublabel?: string, href: string }} map
 */

/** @type {ResourceSource[]} */
const resourceSources = [
	{
		group: 'Deployments',
		icon: 'fa-rocket',
		fn: 'deployment.list',
		map: (it, p) => ({
			key: `${it.location}/${it.name}`,
			label: it.name,
			sublabel: it.location,
			href: `/deployment/metrics?project=${p}&location=${enc(it.location)}&name=${enc(it.name)}`
		})
	},
	{
		group: 'Domains',
		icon: 'fa-globe',
		fn: 'domain.list',
		map: (it, p) => ({
			key: `${it.location}/${it.domain}`,
			label: it.domain,
			sublabel: it.location,
			href: `/domain/detail?project=${p}&domain=${enc(it.domain)}`
		})
	},
	{
		group: 'Routes',
		icon: 'fa-router',
		fn: 'route.list',
		map: (it, p) => ({
			key: `${it.location}/${it.domain}${it.path}`,
			label: `${it.domain}${it.path}`,
			sublabel: it.target,
			href: `/route/manage?project=${p}&location=${enc(it.location)}&domain=${enc(it.domain)}&path=${enc(it.path)}`
		})
	},
	{
		group: 'Firewall',
		icon: 'fa-shield-halved',
		fn: 'waf.list',
		map: (it, p) => ({
			key: it.location,
			label: it.location,
			sublabel: it.description || undefined,
			href: `/waf/manage?project=${p}&location=${enc(it.location)}`
		})
	},
	{
		group: 'Workload Identities',
		icon: 'fa-network-wired',
		fn: 'workloadIdentity.list',
		map: (it, p) => ({
			key: `${it.location}/${it.name}`,
			label: it.name,
			sublabel: it.location,
			href: `/workload-identity/detail?project=${p}&location=${enc(it.location)}&name=${enc(it.name)}`
		})
	},
	{
		group: 'Disks',
		icon: 'fa-hdd',
		fn: 'disk.list',
		map: (it, p) => ({
			key: `${it.location}/${it.name}`,
			label: it.name,
			sublabel: it.location,
			href: `/disk/metrics?project=${p}&location=${enc(it.location)}&name=${enc(it.name)}`
		})
	},
	{
		group: 'Pull Secrets',
		icon: 'fa-key',
		fn: 'pullSecret.list',
		map: (it, p) => ({
			key: `${it.location}/${it.name}`,
			label: it.name,
			sublabel: it.location,
			href: `/pull-secret/detail?project=${p}&location=${enc(it.location)}&name=${enc(it.name)}`
		})
	},
	{
		group: 'Env Groups',
		icon: 'fa-cog',
		fn: 'envGroup.list',
		map: (it, p) => ({
			key: it.name,
			label: it.name,
			href: `/env-group/detail?project=${p}&name=${enc(it.name)}`
		})
	},
	{
		group: 'Roles',
		icon: 'fa-user-tag',
		fn: 'role.list',
		map: (it, p) => ({
			key: it.role,
			label: it.role,
			sublabel: it.name,
			href: `/role/detail?project=${p}&role=${enc(it.role)}`
		})
	},
	{
		group: 'Service Accounts',
		icon: 'fa-user-lock',
		fn: 'serviceAccount.list',
		map: (it, p) => ({
			key: it.sid,
			label: it.email,
			sublabel: it.name,
			href: `/service-account/detail?project=${p}&id=${enc(it.sid)}`
		})
	},
	{
		group: 'Registry',
		icon: 'fa-warehouse-full',
		fn: 'registry.list',
		map: (it, p) => ({
			key: it.name,
			label: it.name,
			href: `/registry/detail?project=${p}&repository=${enc(it.name)}`
		})
	}
]

/**
 * Navigation entries — the sidebar sections, jumpable by name. Always available
 * (no fetch) so the palette is useful the instant it opens.
 *
 * @param {string} project
 * @returns {SearchEntry[]}
 */
export function navEntries (project) {
	return projectMenu.map((m) => ({
		id: `nav:${m.id}`,
		group: 'Go to',
		icon: m.icon,
		label: m.title,
		href: `${m.link}?project=${project}`
	}))
}

/**
 * Fan out to every resource `*.list` endpoint in parallel and flatten the
 * results into search entries. Endpoints that fail (e.g. no permission) are
 * skipped silently so one forbidden resource never blanks the whole palette.
 *
 * @param {string} project
 * @param {typeof fetch} fetch
 * @returns {Promise<SearchEntry[]>}
 */
export async function fetchResourceEntries (project, fetch) {
	const settled = await Promise.all(resourceSources.map(async (src) => {
		try {
			/** @type {Api.Response<Api.List<any>>} */
			const res = await api.invoke(src.fn, { project }, fetch)
			const items = res.result?.items ?? []
			return items.map((it) => {
				const m = src.map(it, project)
				return /** @type {SearchEntry} */ ({
					id: `${src.fn}:${m.key}`,
					group: src.group,
					icon: src.icon,
					label: m.label,
					sublabel: m.sublabel,
					href: m.href
				})
			})
		} catch {
			return /** @type {SearchEntry[]} */ ([])
		}
	}))
	return settled.flat()
}

/**
 * Token AND-match over label + sublabel + group, mirroring the project picker:
 * every whitespace-separated token must appear somewhere in the haystack.
 *
 * @param {SearchEntry[]} entries
 * @param {string} query
 * @returns {SearchEntry[]}
 */
export function filterEntries (entries, query) {
	const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
	if (!tokens.length) return entries
	return entries.filter((e) => {
		const haystack = `${e.label} ${e.sublabel ?? ''} ${e.group}`.toLowerCase()
		return tokens.every((t) => haystack.includes(t))
	})
}
