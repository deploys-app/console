<script>
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()

	const locations = data.locations

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

<div class="nm-breadcrumb">
	<div class="nm-breadcrumb-item">
		<a href={`/workload-identity?project=${project}`} class="nm-link"><h6>Workload Identities</h6></a>
	</div>
	<div class="nm-breadcrumb-item">
		<h6>Create</h6>
	</div>
</div>

<br>
<div class="nm-panel is-level-300 _dp-g _g-7">
	<div class="lo-12 _g-5">
		<div class="_dp-f _alit-ct">
			<h3 class="_mgr-7 _mgbt-6 _mgbt-0:lg"><strong>Create</strong></h3>
		</div>
	</div>
	<hr>
	<form class="_dp-g _g-6 _w-100pct" onsubmit={save}>
		<div class="nm-field">
			<label for="input-name">Name</label>
			<div class="nm-input">
				<input id="input-name" placeholder="name" bind:value={form.name}>
			</div>
		</div>
		<div class="nm-field">
			<label for="input-location">Location</label>
			<div class="nm-select">
				<select id="input-location" bind:value={form.location} required>
					<option value="" selected disabled>Select Location</option>
					{#each locations as it}
						{#if it.features.workloadIdentity}
							<option value={it.id}>{it.id}</option>
						{/if}
					{/each}
				</select>
			</div>
		</div>
		<div class="nm-field">
			<label for="input-gsa">GSA</label>
			<div class="nm-input">
				<input id="input-gsa" placeholder="email gsa" bind:value={form.gsa}>
			</div>
		</div>
		<hr>
		<button class="nm-button _mgr-at" class:is-loading={saving}>Create</button>
	</form>
</div>
