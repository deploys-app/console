import type { PageLoad } from './$types'

export const load: PageLoad = async ({ parent }) => {
	const { projects } = await parent()

	return {
		projects
	}
}
