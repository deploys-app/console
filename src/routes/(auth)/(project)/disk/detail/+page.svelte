<script>
	import { onMount } from 'svelte'
	import * as format from '$lib/format'
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	export let data

	$: project = data.project
	$: location = data.location
	$: name = data.name
	$: disk = data.disk

	onMount(() => api.intervalInvalidate(async () => {
		await api.invalidate('disk.get')
		if (disk.status !== 'pending') {
			return 300000
		}
	}, 4000))

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

	<div class="_dp-g _g-6 _w-100pct">
		<div class="nm-field">
			<label for="input-name">Name</label>
			<div class="nm-input">
				<input id="input-name" value={disk.name} readonly disabled>
			</div>
		</div>
		<div class="nm-field">
			<label for="input-location">Location</label>
			<div class="nm-input">
				<input id="input-location" value={disk.location} readonly disabled>
			</div>
		</div>
		<div class="nm-field">
			<label for="input-size">Size (GiB)</label>
			<div class="nm-input">
				<input id="input-size" value={disk.size} readonly disabled>
			</div>
		</div>
		<div class="nm-field">
			<label for="input-created_at">Created at</label>
			<div class="nm-input">
				<span id="input-created_at">{format.datetime(disk.createdAt)}</span>
			</div>
		</div>
		<div class="nm-field">
			<label for="input-created_by">Created by</label>
			<div class="nm-input">
				<span id="input-created_by">{disk.createdBy}</span>
			</div>
		</div>
	</div>

	<hr>

	<div class="_dp-f _g-6">
		<a class="nm-button" href={`/disk/create?project=${project}&location=${location}&name=${name}`}>Update</a>

		<button class="nm-button" type="button" on:click={deleteItem}>
			Delete
		</button>
	</div>
</div>
