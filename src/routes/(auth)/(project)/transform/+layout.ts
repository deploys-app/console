import type { LayoutLoad } from './$types'

export const load: LayoutLoad = () => {
	return {
		menu: 'transform',
		overrideRedirect: '/transform'
	}
}
