import type { LayoutLoad } from './$types'

export const load: LayoutLoad = () => {
	return {
		menu: 'email',
		overrideRedirect: '/email'
	}
}
