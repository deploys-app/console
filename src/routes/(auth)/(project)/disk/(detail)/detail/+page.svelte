<script>
	import * as format from '$lib/format'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	export let data

	$: project = data.project
	$: location = data.location
	$: name = data.name
	$: disk = data.disk

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
