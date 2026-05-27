<script>
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()
	const id = $derived(data.id)
	const serviceAccount = $derived(data.serviceAccount)

	const project = $derived(data.project)

	let sid = $state(untrack(() => serviceAccount?.sid))
	let name = $state(untrack(() => serviceAccount?.name))
	let desc = $state(untrack(() => serviceAccount?.description))
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
		const fn = id ? 'serviceAccount.update' : 'serviceAccount.create'
		try {
			const resp = await api.invoke(fn, { project, sid, name, description: desc }, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			await api.invalidate('serviceAccount.list')
			goto(`/service-account?project=${project}`)
		} catch (e) {
			modal.error({ error: e })
		} finally {
			saving = false
		}
	}
</script>

<div class="breadcrumb">
	{#if id}
		<div class="breadcrumb-item">
			<a href={`/service-account?project=${project}&id=${id}`} class="link"><h6>{serviceAccount.sid}</h6></a>
		</div>
	{:else}
		<div class="breadcrumb-item">
			<a href={`/service-account?project=${project}`} class="link"><h6>Service Accounts</h6></a>
		</div>
	{/if}
	<div class="breadcrumb-item">
		<h6>
			{#if id}
				Update
			{:else}
				Create
			{/if}
		</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div>
		<h4><strong>{#if id}Edit service account{:else}Create service account{/if}</strong></h4>
		<p class="page-sub">Programmatic identity for API and automation access.</p>
	</div>
</div>

<div class="panel is-level-300 grid gap-6">
	<form class="grid gap-4 w-full" onsubmit={save}>
		{#if id}
			<div class="field">
				<label for="input-email">Email</label>
				<div class="input">
					<input id="input-email" value={serviceAccount.email} readonly>
				</div>
			</div>
		{:else}
			<div class="field">
				<label for="input-sid">ID</label>
				<div class="input">
					<input id="input-sid" placeholder="ID" bind:value={sid}>
				</div>
			</div>
		{/if}

		<div class="field">
			<label for="input-name">Name</label>
			<div class="input">
				<input id="input-name" placeholder="Name" required bind:value={name}>
			</div>
		</div>

		<div class="field">
			<label for="input-description">Description</label>
			<div class="textarea">
				<textarea id="input-description" rows="5" placeholder="Description" bind:value={desc}></textarea>
			</div>
		</div>

		<button class="button mr-auto" class:is-loading={saving} disabled={saving}>Save</button>
	</form>
</div>
