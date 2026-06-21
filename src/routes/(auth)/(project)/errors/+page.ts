import type { PageLoad } from './$types'

export const load: PageLoad = async ({ parent }) => {
	const { project } = await parent()
	return {
		project,
		menu: 'errors',
		overrideRedirect: '/errors'
	}
}
