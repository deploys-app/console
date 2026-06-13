<script>
	import * as format from '$lib/format'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import DangerZone from '$lib/components/DangerZone.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const location = $derived(data.location)
	const name = $derived(data.name)
	const disk = $derived(data.disk)

	function deleteItem () {
		modal.confirm({
			title: `Delete "${name}"?`,
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

<div class="grid gap-4 w-full">
	<div class="field">
		<label for="input-name">Name</label>
		<div class="input">
			<input id="input-name" value={disk.name} readonly disabled>
		</div>
	</div>
	<div class="field">
		<label for="input-location">Location</label>
		<div class="input">
			<input id="input-location" value={disk.location} readonly disabled>
		</div>
	</div>
	<div class="field">
		<label for="input-size">Size (GiB)</label>
		<div class="input">
			<input id="input-size" value={disk.size} readonly disabled>
		</div>
	</div>
	<div class="field">
		<label for="input-created_at">Created at</label>
		<div class="input">
			<input id="input-created_at" value={format.datetime(disk.createdAt)} readonly disabled>
		</div>
	</div>
	<div class="field">
		<label for="input-created_by">Created by</label>
		<div class="input">
			<input id="input-created_by" value={disk.createdBy} readonly disabled>
		</div>
	</div>
</div>

<hr>

<div class="flex gap-4">
	<GuardedButton permission="disk.update" href={`/disk/create?project=${project}&location=${location}&name=${name}`}>Update</GuardedButton>
</div>

<DangerZone description="Permanently delete this disk. All data stored on it will be lost.">
	<GuardedButton permission="disk.delete" class="button is-variant-negative" type="button" onclick={deleteItem}>
		Delete
	</GuardedButton>
</DangerZone>
