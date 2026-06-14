<script>
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import Select from '$lib/components/Select.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const locations = $derived(data.locations)

	const form = $state({
		location: '',
		description: ''
	})

	let saving = $state(false)

	/** @param {Event} e */
	async function save (e) {
		e.preventDefault()
		if (saving) return

		saving = true
		try {
			const resp = await api.invoke('cache.set', {
				project,
				location: form.location,
				description: form.description,
				overrides: []
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			goto(`/cache/manage?project=${project}&location=${encodeURIComponent(form.location)}`)
		} finally {
			saving = false
		}
	}

	function cancel () {
		goto(`/cache?project=${project}`)
	}
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/cache?project=${project}`} class="link"><h6>Cache</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6>Configure</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div>
		<h4><strong>Configure cache</strong></h4>
		<p class="page-sub">Enable edge cache overrides in a location.</p>
	</div>
</div>

<div class="panel is-level-300 grid gap-6">
	{#if locations.length === 0}
		<p class="text-content/60">
			Every location already has cache configured. Manage an existing one
			from the <a href={`/cache?project=${project}`} class="link">cache list</a>.
		</p>
	{:else}
		<form class="grid gap-4 w-full" onsubmit={save}>
			<div class="field">
				<label for="input-location">Location</label>
				<Select
					id="input-location"
					bind:value={form.location}
					required
					placeholder="Select Location"
					options={locations.map((it) => ({ value: it.id, label: it.id }))} />
			</div>
			<div class="field">
				<label for="input-description">Description</label>
				<div class="input">
					<input id="input-description" bind:value={form.description} placeholder="Optional description">
				</div>
			</div>

			<hr>

			<div class="flex gap-3">
				<GuardedButton permission="cache.set" type="submit" loading={saving}>Save</GuardedButton>
				<button type="button" class="button is-variant-secondary" onclick={cancel}>Cancel</button>
			</div>
		</form>
	{/if}
</div>
