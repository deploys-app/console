<script>
	import { onMount } from 'svelte'
	import api from '$lib/api'
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import { page } from '$app/stores'

	const { data, children } = $props()

	const project = $derived(data.project)
	const disk = $derived(data.disk)

	onMount(() => api.intervalInvalidate(async () => {
		await api.invalidate('disk.get')
		if (disk.status !== 'pending') {
			return 300000
		}
	}, 4000))
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/disk?project=${project}`} class="link"><h6>Disks</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6>{disk.name}</h6>
	</div>
</div>

<br>

<div class="panel is-level-300 grid gap-6">
	<div class="grid grid-cols-1 gap-3">
		<h3>
			<StatusIcon status={disk.status} />
			<strong>Disk: {disk.name}</strong>
		</h3>
	</div>

	<hr>

	<div class="tabs is-variant-underline xl:mb-0 w-full flex-col lg:flex-row">
		<a class="tab-button"
			class:is-active={$page.url.pathname === '/disk/metrics'}
			href={`/disk/metrics?project=${project}&location=${disk.location}&name=${disk.name}`}>
			Metric
		</a>
		<a class="tab-button"
			class:is-active={$page.url.pathname === '/disk/detail'}
			href={`/disk/detail?project=${project}&location=${disk.location}&name=${disk.name}`}>
			Details
		</a>
	</div>

	{@render children?.()}
</div>
