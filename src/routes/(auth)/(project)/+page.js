import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	const [
		usage,
		price,
		auditLog
	] = await Promise.all([
		api.invoke('project.usage', { project }, fetch),
		api.invoke('billing.project', { project }, fetch),
		api.invoke('auditLog.list', { project, limit: 5 }, fetch)
	])
	return {
		menu: 'dashboard',
		usage: usage.result ?? {},
		price: price.result ?? {},
		auditLog: {
			items: auditLog.result?.items ?? [],
			error: auditLog.error
		}
	}
}
