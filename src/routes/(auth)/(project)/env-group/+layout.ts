import type { LayoutLoad } from './$types'

export const load: LayoutLoad = () => {
	return {
		menu: 'env-group',
		overrideRedirect: '/env-group'
	}
}
