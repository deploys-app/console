<script>
	import Cookie from 'js-cookie'
	import { browser } from '$app/env'

	export let data

	const project = data.project

	$: {
		if (browser) {
			Cookie.set('project', project, { expires: 7 })
		}
	}
</script>

<slot />
