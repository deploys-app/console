<script>
	import { page } from '$app/stores'

	const { data, children } = $props()

	const project = $derived(data.project)
</script>

<div class="page-head">
	<div>
		<h4><strong>Dropbox</strong></h4>
		<p class="page-sub">Upload and share files</p>
	</div>
</div>

<div class="tabs is-variant-underline w-full flex-col lg:flex-row mb-4">
	<a class="tab-button"
		class:is-active={$page.url.pathname === '/dropbox'}
		href={`/dropbox?project=${project}`}>
		Files
	</a>
	<a class="tab-button"
		class:is-active={$page.url.pathname === '/dropbox/usage'}
		href={`/dropbox/usage?project=${project}`}>
		Usage
	</a>
</div>

{@render children?.()}
