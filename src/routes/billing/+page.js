import { error } from '@sveltejs/kit';
import api from '$lib/api'

export async function load ({ fetch }) {
	const billingAccounts = await api.invoke('billing.list', {}, fetch)
	if (!billingAccounts.ok) {
		throw error(500, `billingAccounts: ${billingAccounts.error.message}`);
	}
	return {
		billingAccounts: billingAccounts.result.items || []
	}
}
