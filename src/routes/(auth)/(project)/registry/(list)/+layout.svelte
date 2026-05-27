<script>
	import { page } from '$app/stores'

	const { data, children } = $props()

	const project = $derived(data.project)
</script>

<div class="page-head">
	<div>
		<h4><strong>Registry</strong></h4>
		<p class="page-sub">Container image registry</p>
	</div>
</div>

<div class="tabs is-variant-underline w-full flex-col lg:flex-row mb-4">
	<a class="tab-button"
		class:is-active={$page.url.pathname === '/registry'}
		href={`/registry?project=${project}`}>
		Repositories
	</a>
	<a class="tab-button"
		class:is-active={$page.url.pathname === '/registry/usage'}
		href={`/registry/usage?project=${project}`}>
		Usage
	</a>
</div>

{@render children?.()}
