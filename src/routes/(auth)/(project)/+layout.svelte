<script>
	import Cookie from 'js-cookie'
	import { onMount } from 'svelte'

	const { data, children } = $props()

	const project = data.project

	onMount(() => {
		Cookie.set('project', project, { expires: 7 })
	})
</script>

{@render children?.()}
