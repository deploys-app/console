import type { PageLoad } from './$types'

export const load: PageLoad = async ({ parent, url }) => {
	const {
		deployment
	} = await parent()

	return {
		deployment,
		// Optional deep-link from the project-wide Errors view: open straight to
		// this issue (expanded) instead of just landing on the tab.
		initialIssueId: url.searchParams.get('id') ?? undefined
	}
}
