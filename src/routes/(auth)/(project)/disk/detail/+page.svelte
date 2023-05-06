<script>
	import { onDestroy } from 'svelte'
	import format from '$lib/format'
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import { browser } from '$app/environment'
	import { goto } from '$app/navigation'
	import modal from '$lib/modal'
	import api from '$lib/api'

	export let data

	let project
	$: project = data.project

	let location
	$: location = data.location

	let name
	$: name = data.name

	/** @type {import('$types').Disk} */
	let disk
	$: disk = data.disk

	let pendingTimeout
	$: {
		if (browser) {
			const hasPending = disk.status === 'pending'
			if (hasPending) {
				pendingTimeout = setTimeout(() => api.invalidate('disk.get'), 4000)
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
	<ul class="breadcrumb">
		<li>
			<a href={`/disk?project=${project}`} class="link"><h6>Disks</h6></a>
		</li>
		<li>
			<h6>{disk.name}</h6>
		</li>
	</ul>
</div>

<br>

<div class="panel _dp-g _gg-24px">
	<div class="lo-12 _gg-12px">
		<div class="_dp-g _gg-16px _gatf-r _gatf-cl-lg _jtfct-spbtw">
			<h3 class="_mgr-24px _mgbt-0px-lg">
				<StatusIcon status={disk.status} />
				<strong>Disk: {disk.name}</strong>
			</h3>
			<div class="_dp-f">
				<button class="button -small -negative -tertiary" type="button" on:click={deleteItem}>
					Delete
				</button>
			</div>
		</div>
	</div>

	<hr>

	<div class="_dp-g _gg-16px _w-100pct _mxw-512px">
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
				<span id="input-created_at">{format.datetime(disk.createdAt)}</span>
			</div>
		</div>
		<div class="field">
			<label for="input-created_by">Created by</label>
			<div class="input">
				<span id="input-created_by">{disk.createdBy}</span>
			</div>
		</div>
	</div>

	<hr>

	<div class="_dp-f _alit-ct _fw-w">
		<a class="button -danger -small" href={`/disk/create?project=${project}&location=${location}&name=${name}`}>Update</a>
	</div>
</div>
