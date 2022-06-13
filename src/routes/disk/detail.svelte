<script context="module">
	import api from '$lib/api'

	export async function load ({ url, stuff, fetch }) {
		const { project } = stuff
		const location = url.searchParams.get('location')
		const name = url.searchParams.get('name')

		const disk = await api.invoke('disk.get', { project, location, name }, fetch)
		if (!disk.ok) {
			if (disk.error.notFound) {
				return {
					status: 302,
					redirect: `/disk?project=${project}`
				}
			}
			return {
				status: 500,
				error: `disk: ${disk.error.message}`
			}
		}

		return {
			props: {
				location,
				name,
				disk: disk.result
			},
			dependencies: ['disk']
		}
	}
</script>

<script>
	import { onDestroy } from 'svelte'
	import { page } from '$app/stores'
	import format from '$lib/format'
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import { browser } from '$app/env'
	import { goto, invalidate } from '$app/navigation'
	import modal from '$lib/modal'

	export let location
	export let name
	export let disk

	$: project = $page.stuff.project

	let pendingTimeout
	$: {
		if (browser) {
			const hasPending = disk.status === 'pending'
			if (hasPending) {
				pendingTimeout = setTimeout(() => invalidate('disks'), 2000)
			}
		}
	}

	if (browser) {
		onDestroy(() => {
			clearTimeout(pendingTimeout)
		})
	}

	function deleteItem () {
		modal.confirm({
			title: `Delete "${name}" ?`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('disk.delete', { project, location, name }, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				await goto(`/disk?project=${project}`)
			}
		})
	}
</script>

<div>
	<ul class="moon-breadcrumb">
		<li>
			<a href={`/disk?project=${project}`} class="moon-link"><h6>Disks</h6></a>
		</li>
		<li>
			<h6>{disk.name}</h6>
		</li>
	</ul>
</div>

<br>

<div class="moon-panel _dp-g _gg-24px">
	<div class="lo-12 _gg-12px">
		<div class="_dp-f _alit-ct">
			<h3><StatusIcon status={disk.status} /></h3>
			<h3 class="_mgr-24px _mgbt-0px-lg">Disk "{disk.name}"</h3>
		</div>
	</div>

	<hr>

	<div class="_dp-g _gg-16px _w-100pct _mxw-512px">
		<div class="moon-field">
			<label for="input-name">Name</label>
			<div class="moon-input">
				<input id="input-name" type="text" value={disk.name} readonly disabled>
			</div>
		</div>
		<div class="moon-field">
			<label for="input-location">Location</label>
			<div class="moon-input">
				<input id="input-location" type="text" value={disk.location} readonly disabled>
			</div>
		</div>
		<div class="moon-field">
			<label for="input-size">Size (GiB)</label>
			<div class="moon-input">
				<input id="input-size" type="text" value={disk.size} readonly disabled>
			</div>
		</div>
		<div class="moon-field">
			<label for="input-created_at">Created at</label>
			<div class="moon-input">
				<span id="input-created_at">{format.datetime(disk.createdAt)}</span>
			</div>
		</div>
		<div class="moon-field">
			<label for="input-created_by">Created by</label>
			<div class="moon-input">
				<span id="input-created_by">{disk.createdBy}</span>
			</div>
		</div>
	</div>

	<div class="_dp-f _fw-w _alit-ct _mgv-32px">
		<button class="moon-button -danger -small" type="button" on:click={deleteItem}>Delete</button>
	</div>
</div>
