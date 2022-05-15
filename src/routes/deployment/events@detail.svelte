<script>
	import { getContext, onMount } from 'svelte'
	import format from '$lib/format'

	const detail = getContext('deployment')

	let list = []

	onMount(() => {
		reloadEvents()
	})

	async function reloadEvents () {
		const response = await fetch($detail.eventUrl)
		const result = await response.json()
		list = result || []
	}
</script>

<h6><strong>Events</strong></h6>

<div class="moon-table-container">
	<table class="moon-table">
		<thead>
		<tr>
			<th>Last Seen</th>
			<th>Type</th>
			<th>Reason</th>
			<th>Message</th>
		</tr>
		</thead>
		<tbody>
		{#each list as it}
			<tr class:row-error={it.type !== 'Normal'}>
				<td>{format.datetime(it.lastSeen)}</td>
				<td>{it.type}</td>
				<td>{it.reason}</td>
				<td>{it.message}</td>
			</tr>
		{/each}
		</tbody>
	</table>
</div>
