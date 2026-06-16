import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	const [
		usage,
		price,
		auditLog,
		storageMetrics
	] = await Promise.all([
		api.invoke('project.usage', { project }, fetch),
		api.invoke('billing.project', { project }, fetch),
		api.invoke('auditLog.list', { project, limit: 6 }, fetch),
		api.invoke('project.storageMetrics', { project, timeRange: '30d' }, fetch)
	])
	return {
		menu: 'dashboard',
		usage: usage.result ?? {},
		price: price.result ?? {},
		auditLog: {
			items: auditLog.result?.items ?? [],
			error: auditLog.error
		},
		staticStorage: storageMetrics.result?.staticStorage ?? []
	}
}
