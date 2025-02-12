<script>
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()
	const {
		id,
		serviceAccount
	} = data

	const project = $derived(data.project)

	let sid = $state(serviceAccount?.sid)
	let name = $state(serviceAccount?.name)
	let desc = $state(serviceAccount?.description)
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

<div class="nm-breadcrumb">
	{#if id}
		<div class="nm-breadcrumb-item">
			<a href={`/service-account?project=${project}&id=${id}`} class="nm-link"><h6>{serviceAccount.sid}</h6></a>
		</div>
	{:else}
		<div class="nm-breadcrumb-item">
			<a href={`/service-account?project=${project}`} class="nm-link"><h6>Service Accounts</h6></a>
		</div>
	{/if}
	<div class="nm-breadcrumb-item">
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

<div class="nm-panel is-level-300 _dp-g _g-7">
	<div class="lo-12 _g-5">
		<div class="_dp-f _alit-ct">
			<h3 class="_mgr-7 _mgbt-6 _mgbt-0:lg"><strong>
				{#if id}
					Update service account "{serviceAccount.sid}"
				{:else}
					Create service account
				{/if}
			</strong></h3>
		</div>
	</div>

	<hr>

	<form class="_dp-g _g-6 _w-100pct" onsubmit={save}>
		{#if id}
			<div class="nm-field">
				<label for="input-email">Email</label>
				<div class="nm-input">
					<input id="input-email" value={serviceAccount.email} readonly>
				</div>
			</div>
		{:else}
			<div class="nm-field">
				<label for="input-sid">ID</label>
				<div class="nm-input">
					<input id="input-sid" placeholder="ID" bind:value={sid}>
				</div>
			</div>
		{/if}

		<div class="nm-field">
			<label for="input-name">Name</label>
			<div class="nm-input">
				<input id="input-name" placeholder="Name" required bind:value={name}>
			</div>
		</div>

		<div class="nm-field">
			<label for="input-description">Description</label>
			<div class="nm-textarea">
				<textarea id="input-description" rows="5" placeholder="Description" bind:value={desc}></textarea>
			</div>
		</div>

		<button class="nm-button _mgr-at" class:is-loading={saving} disabled={saving}>Save</button>
	</form>
</div>
