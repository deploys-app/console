<script lang="ts">
	import type { PageData } from './$types'
	import UsageMetrics from '$lib/components/UsageMetrics.svelte'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
</script>

<div class="page-head">
	<div>
		<h4><strong>Registry</strong></h4>
		<p class="page-sub">Container image registry</p>
	</div>
	<a class="button is-variant-secondary is-icon-left" href={`/registry?project=${project}`}>
		<i class="fa-solid fa-arrow-left"></i>
		Repositories
	</a>
</div>

<UsageMetrics {project} fn="registry.metrics" />
