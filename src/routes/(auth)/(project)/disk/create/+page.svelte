<script>
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()
	const {
		locations,
		location,
		name,
		disk
	} = data

	const project = $derived(data.project)

	const form = $state({
		location: location || '',
		name: name || '',
		size: disk?.size || 1
	})

	let saving = $state(false)

	/**
	 * @param {Event} e
	 */
	async function save (e) {
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

<div class="nm-breadcrumb">
	<div class="nm-breadcrumb-item">
		<a href={`/disk?project=${project}`} class="nm-link"><h6>Disks</h6></a>
	</div>
	{#if disk}
		<div class="nm-breadcrumb-item">
			<a href={`/disk/detail?project=${project}&location=${disk.location}&name=${disk.name}`} class="nm-link"><h6>{disk.name}</h6></a>
		</div>
	{/if}
	<div class="nm-breadcrumb-item">
		<h6>{#if disk}Update{:else}Create{/if}</h6>
	</div>
</div>

<br>

<div class="nm-panel is-level-300 _dp-g _g-7">
	<div class="lo-12 _g-5">
		<div class="_dp-f _alit-ct">
			<h3 class="_mgr-7 _mgbt-6 _mgbt-0:lg"><strong>
				{#if disk}
					Update Disk {disk.name}
				{:else}
					Create Disk
				{/if}
			</strong></h3>
		</div>
	</div>

	<hr>

	<form class="_dp-g _g-6 _w-100pct _mxw-512px" onsubmit={save}>
		<div class="nm-field">
			<label for="input-name">Disk name</label>
			<div class="nm-input">
				<input id="input-name" placeholder="name" bind:value={form.name} readonly={!!disk}>
			</div>
		</div>
		<div class="nm-field">
			<label for="input-location">Location</label>
			{#if disk}
				<div class="nm-input">
					<input id="input-location" value={form.location} readonly>
				</div>
			{:else}
				<div class="nm-select">
					<select id="input-location" bind:value={form.location} required>
						<option value="">Select Location</option>
						{#each locations as it}
							{#if it.features.disk}
								<option value={it.id}>
									{it.id}
								</option>
							{/if}
						{/each}
					</select>
				</div>
			{/if}
		</div>
		<div class="nm-field">
			<label for="input-size">Disk size (GiB)</label>
			<div class="nm-input">
				<input id="input-size" type="number" placeholder="disk size" min="1" max="100" bind:value={form.size}>
			</div>
		</div>

		<button class="nm-button _mgr-at" class:is-loading={saving}>
			{#if disk}
				Save
			{:else}
				Create
			{/if}
		</button>
	</form>
</div>

