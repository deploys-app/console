import { error } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()

	const [
		usage,
		price
	] = await Promise.all([
		api.invoke('project.usage', { project }, fetch),
		api.invoke('billing.project', { project }, fetch)
	])
	if (!usage.ok && usage.error?.forbidden) {
		usage.ok = true
	}
	if (!price.ok && price.error?.forbidden) {
		price.ok = true
	}

	if (!usage.ok || !price.ok) {
		error(500, `usage: ${usage.error?.message}, price: ${price.error?.message}`)
	}

	return {
		menu: 'dashboard',
		permission: {
			billing: !usage.error?.forbidden && !price.error?.forbidden
		},
		usage: usage.result ?? {},
		price: price.result ?? {}
	}
}
