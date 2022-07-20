<script context="module">
	import api from '$lib/api'

	export async function load ({ url, stuff, fetch }) {
		const { project } = stuff
		const id = url.searchParams.get('id')
		const serviceAccount = await api.invoke('serviceAccount.get', { project, id }, fetch)
		if (!serviceAccount.ok) {
			if (serviceAccount.error.message === 'api: service account not found') {
				return {
					status: 302,
					redirect: `/service-account?project=${project}`
				}
			}
			return {
				status: 500,
				error: `serviceAccount: ${serviceAccount.error.message}`
			}
		}
		return {
			props: {
				id,
				serviceAccount: serviceAccount.result
			}
		}
	}
</script>

<script>
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import format from '$lib/format'
	import modal from '$lib/modal'

	export let id
	export let serviceAccount

	$: project = $page.stuff.project

	function deleteItem () {
		modal.confirm({
			title: `Delete "${serviceAccount.name}" service account`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('serviceAccount.delete', { project, id }, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				await goto(`/service-account?project=${project}`)
			}
		})
	}

	let loadingCreateKey

	async function createKey () {
		if (loadingCreateKey) {
			return
		}

		try {
			loadingCreateKey = true
			const resp = await api.invoke('serviceAccount.createKey', { project, id }, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			await api.invalidate('serviceAccount.get')
		} catch (e) {
			modal.error({ error: e })
		} finally {
			loadingCreateKey = false
		}
	}

	function deleteKey (secret) {
		modal.confirm({
			title: 'Confirm delete key ?',
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('serviceAccount.deleteKey', { project, id, secret }, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				await api.invalidate('serviceAccount.get')
			}
		})
	}
</script>

<div>
	<ul class="breadcrumb">
		<li>
			<a href={`/service-account?project=${project}`} class="link"><h6>Service Accounts</h6></a>
		</li>
		<li>
			<h6>{serviceAccount.name}</h6>
		</li>
	</ul>
</div>
<br>

<div class="panel _dp-g _gg-24px">
	<div class="lo-12 _gg-12px">
		<div class="_dp-g _gg-16px _gatf-r _gatf-cl-lg _jtfct-spbtw">
			<h3 class="_mgr-24px _mgbt-16px _mgbt-0px-lg">
				<strong>{serviceAccount.name}</strong>
			</h3>
			<div class="_dp-f">
				<button class="button -small -negative -tertiary" type="button" on:click={deleteItem}>
					Delete
				</button>
			</div>
		</div>
	</div>

	<hr>

	<div class="_dp-g _gg-16px _w-100pct _mxw-512px _mgbt-20px">
		<div class="field">
			<label for="input-email">Email</label>
			<div class="input">
				<input id="input-email" value={serviceAccount.email} readonly>
			</div>
		</div>
		<div class="field">
			<label for="input-name">Name</label>
			<div class="input">
				<input id="input-name" value={serviceAccount.name} readonly>
			</div>
		</div>
		<div class="field">
			<label for="input-description">Description</label>
			<div class="textarea">
				<textarea id="input-description" rows="5" readonly>{serviceAccount.description}</textarea>
			</div>
		</div>
		<div class="field">
			<label for="input-created_at">Created At</label>
			<div class="input">
				<input id="input-created_at" value="{format.datetime(serviceAccount.createdAt)}" readonly>
			</div>
		</div>
		<div class="field">
			<label for="input-created_by">Created By</label>
			<div class="input">
				<input id="input-created_by" value="{serviceAccount.createdBy}" readonly>
			</div>
		</div>
	</div>

	<hr class="_w-100pct _mxw-512px">

	<h6><strong>Keys</strong></h6>
	<div class="_dp-g _gg-16px _w-100pct _mxw-512px">
		{#each (serviceAccount.keys || []) as key}
			<div class="input -has-icon-right">
				<input value="{key.secret}" readonly>
				<div class="icon -is-right _cs-pt">
					<button class="_bgcl-tpr _cs-pt _bdw-0px _cl-light-primary" style="outline: none;" on:click={() => deleteKey(key.secret)} type="button">
						<i class="fa-solid fa-trash-alt"></i>
					</button>
				</div>
			</div>
		{/each}
		<div class="_dp-g _gg-16px _w-100pct _mxw-512px">
			<button class="button -small _mgh-at" class:loading={loadingCreateKey} on:click={createKey} disabled={loadingCreateKey} type="button">
				<i class="fa-solid fa-plus _mgr-12px"></i>
				Create key
			</button>
		</div>
	</div>
</div>
