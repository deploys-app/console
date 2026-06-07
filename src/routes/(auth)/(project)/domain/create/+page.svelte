<script>
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import Select from '$lib/components/Select.svelte'

	const { data } = $props()
	const project = $derived(data.project)
	const locations = $derived(data.locations)

	const form = $state({
		domain: '',
		location: '',
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

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/domain?project=${project}`} class="link"><h6>Domains</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6>Create</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div>
		<h4><strong>Create domain</strong></h4>
		<p class="page-sub">Map a custom domain to your deployments. CDN is included.</p>
	</div>
</div>

<div class="panel is-level-300 grid gap-6">
	<form class="grid gap-4 w-full" onsubmit={save}>
		<div class="field">
			<label for="input-domain">Domain</label>
			<div class="input">
				<input id="input-domain" bind:value={form.domain}>
			</div>
		</div>
		<div class="field">
			<label for="input-location">Location</label>
			<Select
				id="input-location"
				bind:value={form.location}
				required
				placeholder="Select Location"
				options={locations.map((it) => ({ value: it.id, label: it.id }))} />
		</div>

		<div class="field mt-3">
			<h6><strong>Advanced Settings</strong></h6>
		</div>

		<div class="field">
			<div class="checkbox">
				<input id="input-wildcard" type="checkbox" bind:checked={form.wildcard}>
				<label for="input-wildcard">Wildcard</label>
			</div>
		</div>

		<hr>

		<button class="button mr-auto" class:is-loading={saving}>Save</button>
	</form>
</div>

