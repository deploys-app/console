<script>
	import { goto } from '$app/navigation'
	import modal from '$lib/modal'
	import api from '$lib/api'

	export let data
	const {
		locations,
		location,
		name,
		disk
	} = data
	$: ({ project } = data)

	const form = {
		location: location || '',
		name: name || '',
		size: disk?.size || 1
	}

	let saving
	async function save () {
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

<div>
	<ul class="breadcrumb">
		<li>
			<a href={`/disk?project=${project}`} class="link"><h6>Disks</h6></a>
		</li>
		{#if disk}
			<li>
				<a href={`/disk/detail?project=${project}&location=${disk.location}&name=${disk.name}`} class="link"><h6>{disk.name}</h6></a>
			</li>
		{/if}
		<li>
			<h6>{#if disk}Update{:else}Create{/if}</h6>
		</li>
	</ul>
</div>

<br>

<div class="panel _dp-g _gg-24px">
	<div class="lo-12 _gg-12px">
		<div class="_dp-f _alit-ct">
			<h3 class="_mgr-24px _mgbt-16px _mgbt-0px-lg"><strong>
				{#if disk}
					Update Disk {disk.name}
				{:else}
					Create Disk
				{/if}
			</strong></h3>
		</div>
	</div>

	<hr>

	<form class="_dp-g _gg-16px _w-100pct _mxw-512px" on:submit|preventDefault={save}>
		<div class="field">
			<label for="input-name">Disk name</label>
			<div class="input">
				<input id="input-name" placeholder="name" bind:value={form.name} readonly={!!disk}>
			</div>
		</div>
		<div class="field _mgbt-20px">
			<label for="input-location">Location</label>
			{#if disk}
				<div class="input">
					<input id="input-location" value={form.location} readonly>
				</div>
			{:else}
				<div class="select">
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
		<div class="field">
			<label for="input-size">Disk size (GiB)</label>
			<div class="input">
				<input id="input-size" type="number" placeholder="disk size" min="1" max="100" bind:value={form.size}>
			</div>
		</div>

		<hr>

		<button class="button _mgr-at" class:-loading={saving}>
			{#if disk}
				Save
			{:else}
				Create
			{/if}
		</button>
	</form>
</div>

