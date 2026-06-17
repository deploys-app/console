<script lang="ts">
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import Select from '$lib/components/Select.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()
	const locations = $derived(data.locations)
	const location = untrack(() => data.location)
	const name = untrack(() => data.name)
	const disk = untrack(() => data.disk)

	const project = $derived(data.project)

	const form = $state({
		location: location || '',
		name: name || '',
		size: disk?.size || 1
	})

	// Edit mode submits disk.update; create mode submits disk.create.
	const submitPermission = $derived(disk ? 'disk.update' : 'disk.create')

	let saving = $state(false)

	async function save (e: Event) {
		e.preventDefault()

		if (saving) {
			return
		}

		saving = true
		const fn = disk ? 'disk.update' : 'disk.create'
		try {
			const resp = await api.invoke(fn, {
				project,
				location: form.location,
				name: form.name,
				size: form.size
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			goto(`/disk?project=${project}`)
		} catch (e) {
			modal.error({ error: e })
		} finally {
			saving = false
		}
	}
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/disk?project=${project}`} class="link"><h6>Disks</h6></a>
	</div>
	{#if disk}
		<div class="breadcrumb-item">
			<a href={`/disk/detail?project=${project}&location=${disk.location}&name=${disk.name}`} class="link"><h6>{disk.name}</h6></a>
		</div>
	{/if}
	<div class="breadcrumb-item">
		<h6>{#if disk}Update{:else}Create{/if}</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div>
		<h4><strong>{#if disk}Edit disk{:else}Create disk{/if}</strong></h4>
		<p class="page-sub">Persistent storage you can attach to deployments.</p>
	</div>
</div>

<div class="panel is-level-300 grid gap-6">
	<form class="grid gap-4 w-full max-w-[512px]" onsubmit={save}>
		<div class="field">
			<label for="input-name">Disk name</label>
			<div class="input">
				<input id="input-name" placeholder="name" bind:value={form.name} readonly={!!disk}>
			</div>
		</div>
		<div class="field">
			<label for="input-location">Location</label>
			{#if disk}
				<div class="input">
					<input id="input-location" value={form.location} readonly>
				</div>
			{:else}
				<Select
					id="input-location"
					bind:value={form.location}
					required
					placeholder="Select Location"
					options={locations.filter((it) => it.features.disk).map((it) => ({ value: it.id, label: it.id }))} />
			{/if}
		</div>
		<div class="field">
			<label for="input-size">Disk size (GiB)</label>
			<div class="input">
				<input id="input-size" type="number" placeholder="disk size" min="1" max="100" bind:value={form.size}>
			</div>
		</div>

		<GuardedButton permission={submitPermission} type="submit" class="button mr-auto" loading={saving}>
			{#if disk}
				Save
			{:else}
				Create
			{/if}
		</GuardedButton>
	</form>
</div>

