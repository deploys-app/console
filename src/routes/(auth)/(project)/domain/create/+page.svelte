<script>
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()
	const project = $derived(data.project)
	const locations = $derived(data.locations)

	const form = $state({
		domain: '',
		location: '',
		cdn: false,
		wildcard: false
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
			const resp = await api.invoke('domain.create', {
				project,
				location: form.location,
				domain: form.domain,
				cdn: form.cdn,
				wildcard: form.wildcard
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			goto(`/domain/detail?project=${project}&domain=${form.domain}`)
		} finally {
			saving = false
		}
	}
</script>

<div class="nm-breadcrumb">
	<div class="nm-breadcrumb-item">
		<a href={`/domain?project=${project}`} class="nm-link"><h6>Domains</h6></a>
	</div>
	<div class="nm-breadcrumb-item">
		<h6>Create</h6>
	</div>
</div>

<br>

<div class="nm-panel is-level-300 grid gap-6">
	<div class="grid grid-cols-1 gap-3">
		<div class="flex items-center">
			<h3 class="mr-6 mb-4 xl:mb-0"><strong>Create domain</strong></h3>
		</div>
	</div>
	<hr>
	<form class="grid gap-4 w-full" onsubmit={save}>
		<div class="nm-field">
			<label for="input-domain">Domain</label>
			<div class="nm-input">
				<input id="input-domain" bind:value={form.domain}>
			</div>
		</div>
		<div class="nm-field">
			<label for="input-location">Location</label>
			<div class="nm-select">
				<select id="input-location" bind:value={form.location} required>
					<option value="" selected disabled>Select Location</option>
					{#each locations as it (it.id)}
						<option value={it.id}>{it.id}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="nm-field mt-3">
			<h6><strong>Advanced Settings</strong></h6>
		</div>

		<div class="nm-field">
			<div class="nm-checkbox">
				<input id="input-wildcard" type="checkbox" bind:checked={form.wildcard}>
				<label for="input-wildcard">Wildcard</label>
			</div>
		</div>
		<div class="nm-field">
			<div class="nm-checkbox">
				<input id="input-cdn" type="checkbox" bind:checked={form.cdn} disabled>
				<label for="input-cdn">CDN</label>
			</div>
		</div>

		<hr>

		<button class="nm-button mr-auto" class:is-loading={saving}>Save</button>
	</form>
</div>

