import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ parent, fetch }) => {
	const { project } = await parent()

	const [
		usage,
		price,
		auditLog
	] = await Promise.all([
		api.invoke<Api.ProjectUsage>('project.usage', { project }, fetch),
		api.invoke<Api.BillingProject>('billing.project', { project }, fetch),
		api.invoke<Api.List<Api.AuditLogItem>>('auditLog.list', { project, limit: 6 }, fetch)
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
