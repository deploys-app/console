<script lang="ts">
	import type { PageData } from './$types'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import Select from '$lib/components/Select.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const locations = $derived(data.locations)

	const form = $state({
		location: '',
		description: ''
	})

	let saving = $state(false)

	async function save (e: Event) {
		e.preventDefault()
		if (saving) return

		saving = true
		try {
			const resp = await api.invoke('waf.set', {
				project,
				location: form.location,
				description: form.description,
				rules: [],
				limits: []
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			goto(`/waf/manage?project=${project}&location=${encodeURIComponent(form.location)}`)
		} finally {
			saving = false
		}
	}

	function cancel () {
		goto(`/waf?project=${project}`)
	}
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/waf?project=${project}`} class="link"><h6>Firewall</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6>Create</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div>
		<h4><strong>Create firewall</strong></h4>
		<p class="page-sub">Enable the web application firewall in a location.</p>
	</div>
</div>

<div class="panel is-level-300 grid gap-6">
	{#if locations.length === 0}
		<p class="text-content/60">
			Every location already has a firewall configured. Manage an existing one
			from the <a href={`/waf?project=${project}`} class="link">firewall list</a>.
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
				<GuardedButton permission="waf.set" type="submit" loading={saving}>Save</GuardedButton>
				<button type="button" class="button is-variant-secondary" onclick={cancel}>Cancel</button>
			</div>
		</form>
	{/if}
</div>
