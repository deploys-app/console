<script>
	import { page } from '$app/stores'

	const { data, children } = $props()

	const project = $derived(data.project)
	const onUsage = $derived($page.url.pathname === '/dropbox/usage')
</script>

<div class="page-head">
	<div>
		<h4><strong>Dropbox</strong></h4>
		<p class="page-sub">Upload and share files</p>
	</div>
	{#if onUsage}
		<a class="button is-variant-secondary is-icon-left" href={`/dropbox?project=${project}`}>
			<i class="fa-solid fa-arrow-left"></i>
			Files
		</a>
	{:else}
		<a class="button is-variant-secondary is-icon-left" href={`/dropbox/usage?project=${project}`}>
			<i class="fa-solid fa-chart-line"></i>
			Usage
		</a>
	{/if}
</div>

{@render children?.()}
