<script>
	import UsagePageHead from '$lib/components/UsagePageHead.svelte'

	const { data, children } = $props()

	const project = $derived(data.project)
</script>

<UsagePageHead
	title="Registry"
	subtitle="Container image registry"
	basePath="/registry"
	listLabel="Repositories"
	{project} />

{@render children?.()}
