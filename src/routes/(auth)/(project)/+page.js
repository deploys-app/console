import { error, redirect } from '@sveltejs/kit'
import api from '$lib/api'

export async function load ({ parent, fetch }) {
	const { project } = await parent()
	const [projectInfo, usage, price] = await Promise.all([
		api.invoke('project.get', { project }, fetch),
		api.invoke('project.usage', { project }, fetch),
		api.invoke('billing.project', { project }, fetch)
	])

	if (!projectInfo.ok && projectInfo.error.forbidden) {
		throw redirect(302, '/project')
	}

	if (!usage.ok && usage.error.forbidden) {
		usage.ok = true
	}
	if (!price.ok && price.error.forbidden) {
		price.ok = true
	}

	if (!projectInfo.ok || !usage.ok || !price.ok) {
		throw error(500, `usage: ${usage.error.message}, price: ${price.error.message}`)
	}

	return {
		menu: 'dashboard',
		permission: {
			billing: !usage.error?.forbidden && !price.error?.forbidden
		},
		projectInfo: projectInfo.result,
		usage: usage.result || {},
		price: price.result || {}
	}
}
