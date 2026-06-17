import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = ({ locals }) => {
	return {
		restoreProject: locals.project || ''
	}
}
