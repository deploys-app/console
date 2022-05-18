<script context="module">
	import api from '$lib/api'

	export async function load ({ url, stuff, fetch }) {
		const { project } = stuff
		const location = url.searchParams.get('location')
		const name = url.searchParams.get('name')

		const locations = await api.invoke('location.list', { project }, fetch)
		if (!locations.ok) {
			return {
				status: 500,
				error: `locations: ${locations.error.message}`
			}
		}

		let disk
		if (location && name) {
			disk = await api.invoke('disk.get', { project, location, name }, fetch)
			if (!disk.ok) {
				if (disk.error.notFound) {
					return {
						status: 302,
						redirect: '/disk?project=${project}'
					}
				}
				return {
					status: 500,
					error: `disk: ${disk.error.message}`
				}
			}
		}

		return {
			props: {
				locations: locations.result.locations || [],
				location,
				name,
				disk: disk?.result
			}
		}
	}
</script>

<script>
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'

	export let locations
	export let location
	export let name
	export let disk

	$: project = $page.stuff.project

	let form = {
		location: location || '',
		name: name || '',
		size: disk?.size || 1,
	}

	let saving
	async function save () {
		if (saving) {
			return
		}

		saving = true
		const fn = disk ? 'disk.update' : 'disk.create'
		try {
			const result = await api.invoke(fn, {
				project,
				location: form.location,
				name: form.name,
				size: form.size
			}, fetch)
			if (!result.ok) {
				window.dispatchEvent(new CustomEvent('error', {
					detail: {
						error: result.error
					}
				}))
				return
			}
			goto(`/disk?project=${project}`)
		} catch (e) {
			window.dispatchEvent(new CustomEvent('error', {
				detail: {
					error: e
				}
			}))
		} finally {
			saving = false
		}
	}
</script>

<div>
	<ul class="moon-breadcrumb">
		<li>
			<a href={`/disk?project=${project}`} class="moon-link"><h6>Disks</h6></a>
		</li>
		{#if disk}
			<li>
				<a href={`/disk/detail?project=${project}&location=${disk.location}&name=${disk.name}`} class="moon-link"><h6>{disk.name}</h6></a>
			</li>
		{/if}
		<li>
			<h6>{#if disk}Update{:else}Create{/if}</h6>
		</li>
	</ul>
</div>

<br>

<div class="moon-panel _dp-g _gg-24px">
	<div class="lo-12 _gg-12px">
		<div class="_dp-f _alit-ct">
			<h3 class="_mgr-24px _mgbt-16px _mgbt-0px-lg"><strong>Create Disk</strong></h3>
		</div>
	</div>

	<hr>

	<form class="_dp-g _gg-16px _w-100pct _mxw-512px" on:submit|preventDefault={save}>
		<div class="moon-field">
			<label for="input-name">Disk name</label>
			<div class="moon-input">
				<input id="input-name" placeholder="name" bind:value={form.name} readonly={!!disk}>
			</div>
		</div>
		<div class="moon-field _mgbt-20px">
			<label for="input-location">Location</label>
			{#if disk}
				<div class="moon-input">
					<input id="input-location" value={form.location} readonly>
				</div>
			{:else}
				<div class="moon-select">
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
		<div class="moon-field">
			<label for="input-size">Disk size (GiB)</label>
			<div class="moon-input">
				<input id="input-size" type="number" placeholder="disk size" min="1" max="100" bind:value={form.size}>
			</div>
		</div>

		<hr>

		<button class="moon-button _mgr-at" class:-loading={saving}>
			{#if disk}
				Save
			{:else}
				Create
			{/if}
		</button>
	</form>
</div>

