<script context="module">
	import api from '$lib/api'

	export async function load ({ url, stuff, fetch }) {
		const { project } = stuff
		const id = url.searchParams.get('id')
		const serviceAccount = await api.invoke('serviceaccount.get', { project, id }, fetch)
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
			},
			dependencies: ['serviceAccount', 'serviceAccount/keys']
		}
	}
</script>

<script>
	import { goto, invalidate } from '$app/navigation'
	import { page } from '$app/stores'
	import format from '$lib/format'

	export let id
	export let serviceAccount

	$: project = $page.stuff.project

	async function deleteItem () {
		window.dispatchEvent(new CustomEvent('confirm', {
			detail: {
				title: `Delete "${serviceAccount.name}" service account`,
				yes: 'Delete',
				callback: async () => {
					const result = await api.invoke('serviceaccount.delete', { project, id }, fetch)
					if (!result.ok) {
						window.dispatchEvent(new CustomEvent('error', {
							detail: {
								error: result.error
							}
						}))
						return
					}
					await goto(`/service-account?project=${project}`)
				}
			}
		}))
	}

	let loadingCreateKey

	async function createKey () {
		if (loadingCreateKey) {
			return
		}

		try {
			loadingCreateKey = true
			const result = await api.invoke('serviceaccount.createKey', { project: project, id }, fetch)
			if (!result.ok) {
				window.dispatchEvent(new CustomEvent('error', {
					detail: {
						error: result.error
					}
				}))
				return
			}
			await invalidate('serviceAccount/keys')
		} catch (e) {
			window.dispatchEvent(new CustomEvent('error', {
				detail: {
					error: e
				}
			}))
		} finally {
			loadingCreateKey = false
		}
	}

	function deleteKey (secret) {
		window.dispatchEvent(new CustomEvent('confirm', {
			detail: {
				title: 'Confirm delete key ?',
				yes: 'Delete',
				callback: async () => {
					const result = await api.invoke('serviceaccount.deleteKey', { project: project, id, secret }, fetch)
					if (!result.ok) {
						window.dispatchEvent(new CustomEvent('error', {
							detail: {
								error: result.error
							}
						}))
						return
					}
					await invalidate('serviceAccount/keys')
				}
			}
		}))
	}
</script>

<div>
	<ul class="moon-breadcrumb">
		<li>
			<a href={`/service-account?project=${project}`} class="moon-link"><h6>Service Accounts</h6></a>
		</li>
		<li>
			<h6>{serviceAccount.name}</h6>
		</li>
	</ul>
</div>
<br>

<div class="moon-panel _dp-g _gg-24px">
	<div class="lo-12 _gg-12px">
		<div class="_dp-g _gg-16px _gatf-r _gatf-cl-lg _jtfct-spbtw">
			<h3 class="_mgr-24px _mgbt-16px _mgbt-0px-lg"><strong>{serviceAccount.name}</strong>
			</h3>
			<div class="_dp-f">
				<button class="moon-button -small -negative -tertiary" type="button" on:click={deleteItem}>
					Delete service account
				</button>
			</div>
		</div>
	</div>

	<hr>

	<div class="_dp-g _gg-16px _w-100pct _mxw-512px _mgbt-20px">
		<div class="moon-field">
			<label for="input-email">Email</label>
			<div class="moon-input">
				<input type="text" id="input-email" value={serviceAccount.email} readonly>
			</div>
		</div>
		<div class="moon-field">
			<label for="input-name">Name</label>
			<div class="moon-input">
				<input type="text" id="input-name" value={serviceAccount.name} readonly>
			</div>
		</div>
		<div class="moon-field">
			<label for="input-description">Description</label>
			<div class="moon-textarea">
				<textarea id="input-description" rows="5" readonly>{serviceAccount.description}</textarea>
			</div>
		</div>
		<div class="moon-field">
			<label for="input-created_at">Created At</label>
			<div class="moon-input">
				<input type="text" id="input-created_at" value="{format.datetime(serviceAccount.createdAt)}" readonly>
			</div>
		</div>
		<div class="moon-field">
			<label for="input-created_by">Created By</label>
			<div class="moon-input">
				<input type="text" id="input-created_by" value="{serviceAccount.createdBy}" readonly>
			</div>
		</div>
	</div>

	<hr class="_w-100pct _mxw-512px">

	<h6><strong>Keys</strong></h6>
	<div class="_dp-g _gg-16px _w-100pct _mxw-512px">
		{#each (serviceAccount.keys || []) as key}
			<div class="moon-input -has-icon-right">
				<input type="text" value="{key.secret}" readonly>
				<div class="icon -is-right _cs-pt">
					<button class="_bgcl-tpr _cs-pt _bdw-0px _cl-light-primary" style="outline: none;" on:click={() => deleteKey(key.secret)} type="button">
						<i class="fas fa-trash-alt"></i>
					</button>
				</div>
			</div>
		{/each}
		<div class="_dp-g _gg-16px _w-100pct _mxw-512px">
			<button class="moon-button -small icon-button _mgh-at" class:loading={loadingCreateKey} on:click={createKey} disabled={loadingCreateKey} type="button">
				<i class="fas fa-plus _mgr-12px"></i>
				Create key
			</button>
		</div>
	</div>
</div>
