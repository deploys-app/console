<script>
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()

	const project = data.project
	const billingAccounts = data.billingAccounts

	const form = $state({
		sid: project?.project || '',
		name: project?.name || '',
		billingAccount: project?.billingAccount || ''
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
			const resp = project
				? await api.invoke('project.update', {
					project: form.sid,
					name: form.name,
					billingAccount: form.billingAccount
				}, fetch)
				: await api.invoke('project.create', {
					sid: form.sid,
					name: form.name,
					billingAccount: form.billingAccount
				}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			await api.invalidate('project.list')
			await goto(`/?project=${form.sid}`)
		} finally {
			saving = false
		}
	}
</script>

<div class="nm-breadcrumb">
	<div class="nm-breadcrumb-item">
		<a href="/project" class="nm-link"><h6>Projects</h6></a>
	</div>
	{#if project}
		<div class="nm-breadcrumb-item">
			<a href={`/?project=${project.project}`} class="nm-link"><h6>{project.name}</h6></a>
		</div>
	{/if}
	<div class="nm-breadcrumb-item">
		<h6>{#if project}Update{:else}Create{/if}</h6>
	</div>
</div>

<br>
<div class="nm-panel is-level-300 _dp-g _g-7">
	<div class="lo-12 _jtfit-st _g-5">
		{#if project}
			<h5><strong>Update Project: {project.name}</strong></h5>
		{:else}
			<h5><strong>Create Project</strong></h5>
		{/if}
	</div>

	<hr>

	<form class="_dp-g _g-6 _w-100pct" onsubmit={save}>
		<div class="nm-field">
			<label for="input-project">ID</label>
			<div class="nm-input">
				<input id="input-project" placeholder="Project ID" bind:value={form.sid} readonly={!!project}>
			</div>
		</div>

		<div class="nm-field">
			<label for="input-name">Name</label>
			<div class="nm-input">
				<input id="input-name" placeholder="Project name" bind:value={form.name} required>
			</div>
		</div>

		<div class="nm-field">
			<label for="input-billing_account">Billing Account</label>
			<div class="nm-select">
				<select id="input-billing_account" bind:value={form.billingAccount} required>
					<option value="" selected disabled>Select Billing Account</option>
					{#each billingAccounts as it}
						<option value={it.id}>{it.name} ({it.id})</option>
					{/each}
				</select>
			</div>
		</div>

		<button class="nm-button _mgt-6 _mgr-at" class:is-loading={saving}>
			{#if project}
				Update Project
			{:else}
				Create Project
			{/if}
		</button>
	</form>
</div>
