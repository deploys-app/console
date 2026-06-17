import type { LayoutLoad } from './$types'

export const load: LayoutLoad = () => {
	return {
		menu: 'audit-log',
		overrideRedirect: '/audit-log'
	}
}
