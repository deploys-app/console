<script context="module">
	export function load ({ stuff }) {
		const {
			deployment
		} = stuff

		return {
			props: {
				deployment
			}
		}
	}
</script>

<script>
	import { onMount } from 'svelte'
	import format from '$lib/format'
	import { browser } from '$app/env'
	import NoDataRow from '../../lib/components/NoDataRow.svelte'

	export let deployment

	let events = []

	if (browser) {
		onMount(() => {
			reloadEvents()
			const reloadInterval = setInterval(() => reloadEvents(), 5000)
			return () => {
				clearInterval(reloadInterval)
			}
		})
	}

	async function reloadEvents () {
		const response = await fetch(deployment.eventUrl)
		const result = await response.json()
		events = result || []
	}
</script>

<h6><strong>Events</strong></h6>

<div class="table-container">
	<table class="table">
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
			<NoDataRow span="4" />
		{/each}
		</tbody>
	</table>
</div>
