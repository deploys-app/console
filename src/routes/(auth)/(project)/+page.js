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
	return {
		menu: 'dashboard',
		usage: usage.result ?? {},
		price: price.result ?? {}
	}
}
