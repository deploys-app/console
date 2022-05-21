<script context="module">
	import api from '$lib/api'

	export async function load ({ url, stuff, fetch }) {
		const { project } = stuff
		const id = url.searchParams.get('id')

		let serviceAccount
		if (id) {
			serviceAccount = await api.invoke('serviceAccount.get', { project, id }, fetch)
			if (!serviceAccount.ok) {
				if (serviceAccount.error.notFound) {
					return {
						status: 302,
						redirect: '/service-account?project=${project}'
					}
				}
				return {
					status: 500,
					error: `serviceAccount: ${serviceAccount.error.message}`
				}
			}
		}

		return {
			props: {
				id,
				serviceAccount: serviceAccount?.result
			}
		}
	}
</script>

<script>
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'

	export let id
	export let serviceAccount

	$: project = $page.stuff.project

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
			const result = await api.invoke(fn, { project, sid, name, description: desc }, fetch)
			if (!result.ok) {
				window.dispatchEvent(new CustomEvent('error', {
					detail: {
						error: result.error
					}
				}))
				return
			}
			goto(`/service-account?project=${project}`)
		} catch (e) {
			window.dispatchEvent(new CustomEvent('error', {
				detail: {
					error: e
				}
			}))
		} finally {
			saving = false
		}
	}
</script>

<div>
	<ul class="moon-breadcrumb">
		{#if id}
			<li>
				<a href={`/service-account?project=${project}&id=${id}`} class="moon-link"><h6>{serviceAccount.sid}</h6></a>
			</li>
		{:else}
			<li>
				<a href={`/service-account?project=${project}`} class="moon-link"><h6>Service Accounts</h6></a>
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

<div class="moon-panel _dp-g _gg-24px">
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
			<div class="moon-field">
				<label for="input-email">Email</label>
				<div class="moon-input">
					<input id="input-email" value={serviceAccount.email} readonly>
				</div>
			</div>
		{:else}
			<div class="moon-field">
				<label for="input-sid">ID</label>
				<div class="moon-input">
					<input id="input-sid" placeholder="ID" bind:value={sid}>
				</div>
			</div>
		{/if}

		<div class="moon-field">
			<label for="input-name">Name</label>
			<div class="moon-input">
				<input id="input-name" placeholder="Name" required bind:value={name}>
			</div>
		</div>

		<div class="moon-field">
			<label for="input-description">Description</label>
			<div class="moon-textarea">
				<textarea id="input-description" rows="5" placeholder="Description" bind:value={desc}></textarea>
			</div>
		</div>

		<button class="moon-button _mgr-at" class:-loading={saving} disabled={saving}>Save</button>
	</form>
</div>
