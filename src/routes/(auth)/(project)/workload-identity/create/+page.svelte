<script>
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()

	const locations = $derived(data.locations)

	const project = $derived(data.project)

	const form = $state({
		name: '',
		location: '',
		gsa: ''
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
		try {
			const resp = await api.invoke('workloadIdentity.create', {
				project,
				location: form.location,
				name: form.name,
				gsa: form.gsa
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			goto(`/workload-identity?project=${project}`)
		} finally {
			saving = false
		}
	}
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/workload-identity?project=${project}`} class="link"><h6>Workload Identities</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6>Create</h6>
	</div>
</div>

<br>
<div class="panel is-level-300 grid gap-6">
	<div class="grid grid-cols-1 gap-3">
		<div class="flex items-center">
			<h3 class="mr-6 mb-4 xl:mb-0"><strong>Create</strong></h3>
		</div>
	</div>
	<hr>
	<form class="grid gap-4 w-full" onsubmit={save}>
		<div class="field">
			<label for="input-name">Name</label>
			<div class="input">
				<input id="input-name" placeholder="name" bind:value={form.name}>
			</div>
		</div>
		<div class="field">
			<label for="input-location">Location</label>
			<div class="select">
				<select id="input-location" bind:value={form.location} required>
					<option value="" selected disabled>Select Location</option>
					{#each locations as it (it.id)}
						{#if it.features.workloadIdentity}
							<option value={it.id}>{it.id}</option>
						{/if}
					{/each}
				</select>
			</div>
		</div>
		<div class="field">
			<label for="input-gsa">GSA</label>
			<div class="input">
				<input id="input-gsa" placeholder="email gsa" bind:value={form.gsa}>
			</div>
		</div>
		<hr>
		<button class="button mr-auto" class:is-loading={saving}>Create</button>
	</form>
</div>
