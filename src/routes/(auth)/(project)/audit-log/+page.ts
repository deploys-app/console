import api from '$lib/api'
import type { PageLoad } from './$types'

const LIMIT = 50

function toRFC3339 (v: string | null): string | undefined {
	if (!v) return undefined
	const d = new Date(v)
	if (isNaN(d.getTime())) return undefined
	return d.toISOString()
}

export const load: PageLoad = async ({ url, parent, fetch }) => {
	const { project } = await parent()

	const filters = {
		resourceType: url.searchParams.get('resourceType') ?? '',
		actor: url.searchParams.get('actor') ?? '',
		channel: url.searchParams.get('channel') ?? '',
		outcome: url.searchParams.get('outcome') ?? '',
		after: url.searchParams.get('after') ?? '',
		before: url.searchParams.get('before') ?? ''
	}

	const args = {
		project,
		resourceType: filters.resourceType,
		actor: filters.actor,
		channel: filters.channel,
		outcome: filters.outcome,
		after: toRFC3339(filters.after),
		before: toRFC3339(filters.before),
		limit: LIMIT
	}

	const res = await api.invoke<Api.List<Api.AuditLogItem>>('auditLog.list', args, fetch)
	return {
		items: res.result?.items ?? [],
		filters,
		error: res.error
	}
}
