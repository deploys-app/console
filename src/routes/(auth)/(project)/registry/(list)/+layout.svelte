<script>
	import { page } from '$app/stores'

	const { data, children } = $props()

	const project = $derived(data.project)
	const onUsage = $derived($page.url.pathname === '/registry/usage')
</script>

<div class="page-head">
	<div>
		<h4><strong>Registry</strong></h4>
		<p class="page-sub">Container image registry</p>
	</div>
	{#if onUsage}
		<a class="button is-variant-secondary is-icon-left" href={`/registry?project=${project}`}>
			<i class="fa-solid fa-arrow-left"></i>
			Repositories
		</a>
	{:else}
		<a class="button is-variant-secondary is-icon-left" href={`/registry/usage?project=${project}`}>
			<i class="fa-solid fa-chart-line"></i>
			Usage
		</a>
	{/if}
</div>

{@render children?.()}
