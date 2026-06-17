import type { LayoutLoad } from './$types'

export const load: LayoutLoad = () => {
	return {
		menu: 'workload-identity',
		overrideRedirect: '/workload-identity'
	}
}
