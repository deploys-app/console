import api from '$lib/api'
import { projectMenu } from '$lib/nav'
import { pageActions } from '$lib/pageactions/store.svelte'

/**
 * A single searchable item shown in the command palette.
 */
export interface SearchEntry {
	id: string // stable key, unique across all entries
	group: string // section heading, e.g. "Deployments" / "Go to"
	icon: string // Font Awesome class, e.g. `fa-rocket`
	label: string // primary text (the thing you'd type)
	sublabel?: string // secondary text (location, target, …)
	keywords?: string // extra text folded into search only, never shown
	href?: string // navigation target (omitted for `action`/`run` entries)
	action?: 'switch-project' // when set, selecting opens a sub-mode instead of navigating
	run?: () => void // when set, selecting closes the palette and invokes this
}

const enc = encodeURIComponent

/**
 * Resource sources fanned out on open. Each calls a project-scoped `*.list`
 * endpoint and maps every item to a {@link SearchEntry}. Keep the labels to the
 * fields a user would actually type to find the resource.
 */
interface ResourceSource {
	group: string
	icon: string
	fn: string // api function name
	map: (it: any, project: string) => { key: string, label: string, sublabel?: string, href: string }
}

const resourceSources: ResourceSource[] = [
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
 * The single "Switch project" command shown in the default palette. Selecting it
 * (type "project" → Enter) opens the project sub-mode rather than listing every
 * project inline, so a large project list never floods the results.
 */
export function switchProjectEntry (): SearchEntry {
	return {
		id: 'cmd:switch-project',
		group: 'Commands',
		icon: 'fa-folder-open',
		label: 'Switch project',
		sublabel: 'Browse and switch to another project',
		keywords: 'change select swap switch project',
		action: 'switch-project'
	}
}

/**
 * Project-switch entries. Mirrors {@link ../routes/(auth)/ModalSelectProject.svelte}'s
 * `setProject` URL shape: keep the current query params, swap `project=`, and
 * honour `data.overrideRedirect` so switching from a detail page lands on the
 * section's list in the new project instead of a stale deep link.
 *
 * The current project is excluded — switching to where you already are is a
 * no-op and would just be visual noise in the palette. These populate the
 * project sub-mode reached via {@link switchProjectEntry}.
 */
export function projectEntries (projects: Api.Project[], currentProject: string, page: { url: { search: string }, data: { overrideRedirect?: string } }): SearchEntry[] {
	const overrideRedirect = page.data?.overrideRedirect || ''
	return projects
		.filter((p) => p.project !== currentProject)
		.map((p) => {
			const q = new URLSearchParams(page.url.search)
			q.set('project', p.project)
			return ({
				id: `project:${p.project}`,
				group: 'Switch project',
				icon: 'fa-folder-open',
				label: p.name,
				sublabel: p.project,
				// `p.id` is the numeric project number — searchable but not shown.
				keywords: p.id,
				href: `${overrideRedirect}?${q.toString()}`
			} as SearchEntry)
		})
}

/**
 * Context actions contributed by the current page (see
 * {@link ../pageactions/store.svelte.ts}) — e.g. Pause/Restart on a deployment
 * detail page. Listed first in the palette so the page's own commands rank
 * ahead of navigation and resources. The store only holds actionable items, so
 * every entry is safe to select as-is.
 */
export function pageActionEntries (): SearchEntry[] {
	return pageActions.items.map((a) => ({
		id: `page:${a.id}`,
		group: 'This page',
		icon: a.icon ?? 'fa-bolt',
		label: a.label,
		keywords: a.keywords,
		href: a.href,
		run: a.run
	}))
}

/**
 * Navigation entries — the sidebar sections, jumpable by name. Always available
 * (no fetch) so the palette is useful the instant it opens.
 */
export function navEntries (project: string): SearchEntry[] {
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
 * Calls go through `invoke` with `{ silent: true }`: this is a best-effort
 * background fan-out, so a single transient `api: unauthorized` (e.g. one of the
 * parallel requests hitting a momentary backend/DB blip) must NOT fire the
 * global `onUnauth` handler and reload the whole app out from under the user.
 */
export async function fetchResourceEntries (project: string, fetch: typeof globalThis.fetch): Promise<SearchEntry[]> {
	const settled = await Promise.all(resourceSources.map(async (src) => {
		try {
			const res = await api.invoke<Api.List<any>>(src.fn, { project }, fetch, { silent: true })
			const items = res.result?.items ?? []
			return items.map((it) => {
				const m = src.map(it, project)
				return ({
					id: `${src.fn}:${m.key}`,
					group: src.group,
					icon: src.icon,
					label: m.label,
					sublabel: m.sublabel,
					href: m.href
				} as SearchEntry)
			})
		} catch {
			return ([] as SearchEntry[])
		}
	}))
	return settled.flat()
}

/**
 * Token AND-match over label + sublabel + group, mirroring the project picker:
 * every whitespace-separated token must appear somewhere in the haystack.
 */
export function filterEntries (entries: SearchEntry[], query: string): SearchEntry[] {
	const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
	if (!tokens.length) return entries
	return entries.filter((e) => {
		const haystack = `${e.label} ${e.sublabel ?? ''} ${e.keywords ?? ''} ${e.group}`.toLowerCase()
		return tokens.every((t) => haystack.includes(t))
	})
}
