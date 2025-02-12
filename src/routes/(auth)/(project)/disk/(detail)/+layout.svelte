<script>
	import { onMount } from 'svelte'
	import api from '$lib/api'
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import { page } from '$app/stores'

	let { data, children } = $props()

	let project = $derived(data.project)
	let disk = $derived(data.disk)

	onMount(() => api.intervalInvalidate(async () => {
		await api.invalidate('disk.get')
		if (disk.status !== 'pending') {
			return 300000
		}
	}, 4000))
</script>

<div class="nm-breadcrumb">
	<div class="nm-breadcrumb-item">
		<a href={`/disk?project=${project}`} class="nm-link"><h6>Disks</h6></a>
	</div>
	<div class="nm-breadcrumb-item">
		<h6>{disk.name}</h6>
	</div>
</div>

<br>

<div class="nm-panel is-level-300 _dp-g _g-7">
	<div class="lo-12 _g-5">
		<h3>
			<StatusIcon status={disk.status} />
			<strong>Disk: {disk.name}</strong>
		</h3>
	</div>

	<hr>

	<div class="nm-tabs is-variant-underline _mgbt-0:lg _w-100pct _fdrt-cl _fdrt-r:md">
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
