import type { LayoutLoad } from './$types'

export const load: LayoutLoad = () => {
	return {
		menu: 'service-account',
		overrideRedirect: '/service-account'
	}
}
