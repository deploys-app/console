<script context="module">
	export function load ({ session, url }) {
		const pageProject = url.searchParams.get('project')
		const restoreProject = session.project

		if (!pageProject && restoreProject) {
			const q = new URLSearchParams(url.search)
			q.set('project', restoreProject)
			return {
				status: 302,
				redirect: `?${q.toString()}`
			}
		}
		if (!pageProject) {
			return {
				status: 302,
				redirect: `/project`
			}
		}

		return {
			props: {
				project: pageProject,
			},
			stuff: {
				project: pageProject
			}
		}
	}
</script>

<script>
	import Cookie from 'js-cookie'
	import { browser } from '$app/env'

	export let project

	$: {
		if (browser) {
			Cookie.set('project', project, { expires: 7 })
		}
	}
</script>

<slot />
