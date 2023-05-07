<script>
	import Cookie from 'js-cookie'
	import { onMount } from 'svelte'

	export let data

	const project = data.project

	onMount(() => {
		Cookie.set('project', project, { expires: 7 })
	})
</script>

<slot />
