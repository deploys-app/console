import api from '$lib/api'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ fetch }) => {
	const res = await api.invoke<Api.List<Api.BillingAccount>>('billing.list', {}, fetch)
	return {
		billingAccounts: res.result?.items ?? [],
		error: res.error
	}
}
