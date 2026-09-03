import type { LayoutLoad } from './$types'

export const load: LayoutLoad = () => {
	return {
		menu: 'metric-source',
		overrideRedirect: '/metrics-sources'
	}
}
