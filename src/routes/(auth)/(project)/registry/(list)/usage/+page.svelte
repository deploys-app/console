<script>
	import UsageMetrics from '$lib/components/UsageMetrics.svelte'

	const { data } = $props()

	const project = $derived(data.project)
</script>

<UsageMetrics {project} fn="registry.metrics" />
