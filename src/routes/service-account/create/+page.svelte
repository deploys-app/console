<script>
	import { goto } from '$app/navigation'
	import modal from '$lib/modal'
	import api from '$lib/api'

	export let data
	const {
		id,
		serviceAccount
	} = data
	$: ({ project } = data)

	let sid = serviceAccount?.sid
	let name = serviceAccount?.name
	let desc = serviceAccount?.description
	let saving

	async function save () {
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

<div>
	<ul class="breadcrumb">
		{#if id}
			<li>
				<a href={`/service-account?project=${project}&id=${id}`} class="link"><h6>{serviceAccount.sid}</h6></a>
			</li>
		{:else}
			<li>
				<a href={`/service-account?project=${project}`} class="link"><h6>Service Accounts</h6></a>
			</li>
		{/if}
		<li>
			<h6>
				{#if id}
					Update
				{:else}
					Create
				{/if}
			</h6>
		</li>
	</ul>
</div>

<br>

<div class="panel _dp-g _gg-24px">
	<div class="lo-12 _gg-12px">
		<div class="_dp-f _alit-ct">
			<h3 class="_mgr-24px _mgbt-16px _mgbt-0px-lg"><strong>
				{#if id}
					Update service account "{serviceAccount.sid}"
				{:else}
					Create service account
				{/if}
			</strong></h3>
		</div>
	</div>

	<hr>

	<form class="_dp-g _gg-16px _w-100pct _mxw-512px" on:submit|preventDefault={save}>
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

		<button class="button _mgr-at" class:-loading={saving} disabled={saving}>Save</button>
	</form>
</div>
