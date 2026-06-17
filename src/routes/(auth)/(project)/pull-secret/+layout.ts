import type { LayoutLoad } from './$types'

export const load: LayoutLoad = () => {
	return {
		menu: 'pull-secret',
		overrideRedirect: '/pull-secret'
	}
}
