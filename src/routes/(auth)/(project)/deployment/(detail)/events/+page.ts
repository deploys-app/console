import type { PageLoad } from './$types'

export const load: PageLoad = async ({ parent }) => {
	const {
		deployment
	} = await parent()

	return {
		deployment
	}
}
