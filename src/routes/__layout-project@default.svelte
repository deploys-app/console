<script>
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { project } from '$lib/stores'

	$: {
		$project

		if ($project) {
			try {
				localStorage.setItem('project', $project)
			} catch (e) {}
		}
	}

	onMount(() => {
		const restoreProject = localStorage.getItem('project')
		const pageProject = $page.url.searchParams.get('project')
		if (!pageProject && restoreProject) {
			const q = new URLSearchParams($page.url.search)
			q.set('project', restoreProject)
			goto(`?${q.toString()}`)
		}
	})
</script>

<slot />
