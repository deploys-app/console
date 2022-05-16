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

		return {
			stuff: {
				project: pageProject
			}
		}
	}
</script>

<slot />
