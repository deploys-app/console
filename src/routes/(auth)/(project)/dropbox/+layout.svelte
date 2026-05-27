<script>
	import UsagePageHead from '$lib/components/UsagePageHead.svelte'

	const { data, children } = $props()

	const project = $derived(data.project)
</script>

<UsagePageHead
	title="Dropbox"
	subtitle="Upload and share files"
	basePath="/dropbox"
	listLabel="Files"
	{project} />

{@render children?.()}
