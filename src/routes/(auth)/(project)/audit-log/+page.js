import api from '$lib/api'

/**
 * @param {string | null} v
 * @returns {string | undefined}
 */
function toRFC3339 (v) {
	if (!v) return undefined
	const d = new Date(v)
	if (isNaN(d.getTime())) return undefined
	return d.toISOString()
}

export async function load ({ url, parent, fetch }) {
	const { project } = await parent()

	const filters = {
		resourceType: url.searchParams.get('resourceType') ?? '',
		actor: url.searchParams.get('actor') ?? '',
		outcome: url.searchParams.get('outcome') ?? '',
		after: url.searchParams.get('after') ?? '',
		before: url.searchParams.get('before') ?? '',
		limit: Number(url.searchParams.get('limit')) || 50
	}

	const args = {
		project,
		resourceType: filters.resourceType,
		actor: filters.actor,
		outcome: filters.outcome,
		after: toRFC3339(filters.after),
		before: toRFC3339(filters.before),
		limit: filters.limit
	}

	/** @type {Api.Response<Api.List<Api.AuditLogItem>>} */
	const res = await api.invoke('auditLog.list', args, fetch)
	return {
		items: res.result?.items ?? [],
		filters,
		error: res.error
	}
}
