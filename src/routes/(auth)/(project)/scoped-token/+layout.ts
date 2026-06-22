import type { LayoutLoad } from './$types'

export const load: LayoutLoad = () => {
	return {
		menu: 'scoped-token',
		overrideRedirect: '/scoped-token'
	}
}
