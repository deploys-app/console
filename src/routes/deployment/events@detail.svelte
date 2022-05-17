<script context="module">
	export function load ({ stuff }) {
		const {
			location,
			name,
			deployment
		} = stuff

		return {
			props: {
				location,
				name,
				deployment
			}
		}
	}
</script>

<script>
	import { onDestroy, onMount } from 'svelte'
	import format from '$lib/format'
	import { browser } from '$app/env'

	export let deployment

	let events = []

	if (browser) {
		let reloadInterval
		onMount(async () => {
			await reloadEvents()
			reloadInterval = setInterval(() => reloadEvents(), 5000)
		})
		onDestroy(() => {
			clearInterval(reloadInterval)
		})
	}

	async function reloadEvents () {
		const response = await fetch(deployment.eventUrl)
		const result = await response.json()
		events = result || []
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
		{#each events as it}
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
