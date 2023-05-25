<script>
	import { onMount } from 'svelte'
	import * as format from '$lib/format'
	import NoDataRow from '$lib/components/NoDataRow.svelte'

	export let data

	$: deployment = data.deployment

	let events = []

	onMount(() => {
		reloadEvents()
		const reloadInterval = setInterval(() => reloadEvents(), 5000)
		return () => {
			clearInterval(reloadInterval)
		}
	})

	async function reloadEvents () {
		const response = await fetch(deployment.eventUrl)
		if (response.status === 403) {
			// token expired
			return
		}
		const result = await response.json()
		events = result ?? []
	}
</script>

<h6><strong>Events</strong></h6>

<div class="nm-table-container _mgt-6">
	<table class="nm-table is-variant-compact" style="--table-data-border-color: none">
		<thead>
		<tr>
			<th>Last Seen</th>
			<th>Type</th>
			<th>Reason</th>
			<th>Message</th>
		</tr>
		</thead>
		<tbody>
		{#each events as it}
			<tr class:row-error={it.type !== 'Normal'}>
				<td>{format.datetime(it.lastSeen)}</td>
				<td>{it.type}</td>
				<td>{it.reason}</td>
				<td>{it.message}</td>
			</tr>
		{:else}
			<NoDataRow span={4} />
		{/each}
		</tbody>
	</table>
</div>
