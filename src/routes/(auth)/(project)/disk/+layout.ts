import type { LayoutLoad } from './$types'

export const load: LayoutLoad = () => {
	return {
		menu: 'disk',
		overrideRedirect: '/disk'
	}
}
