<script>
	import UsageMetrics from '$lib/components/UsageMetrics.svelte'

	const { data } = $props()

	const project = $derived(data.project)
</script>

<div class="page-head">
	<div>
		<h4><strong>Dropbox</strong></h4>
		<p class="page-sub">Upload and share files</p>
	</div>
	<a class="button is-variant-secondary is-icon-left" href={`/dropbox?project=${project}`}>
		<i class="fa-solid fa-arrow-left"></i>
		Files
	</a>
</div>

<UsageMetrics {project} fn="dropbox.metrics" />
