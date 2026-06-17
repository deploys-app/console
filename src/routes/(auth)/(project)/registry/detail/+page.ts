import { redirect } from '@sveltejs/kit'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url }) => {
	redirect(302, `/registry/detail/tags${url.search}`)
}
