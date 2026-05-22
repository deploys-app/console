<script>
	import { goto } from '$app/navigation'
	import * as format from '$lib/format'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()

	const project = $derived(data.project)
	const id = $derived(data.id)
	const serviceAccount = $derived(data.serviceAccount)

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

	let loadingCreateKey = $state(false)

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
			title: 'Confirm delete key?',
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

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/service-account?project=${project}`} class="link"><h6>Service Accounts</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6>{serviceAccount.name}</h6>
	</div>
</div>

<br>

<div class="panel is-level-300 grid gap-6">
	<div class="grid grid-cols-1 gap-3">
		<h3 class="mr-6 mb-4 xl:mb-0">
			<strong>{serviceAccount.name}</strong>
		</h3>
	</div>

	<hr>

	<div class="content grid gap-4 w-full">
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
			<label for="text-created_at">Created At</label>
			<div class="input">
				<span id="text-created_at">{format.datetime(serviceAccount.createdAt)}</span>
			</div>
		</div>
		<div class="field">
			<label for="text-created_by">Created By</label>
			<div class="input">
				<span id="text-created_by">{serviceAccount.createdBy}</span>
			</div>
		</div>

		<hr>

		<h6><strong>Keys</strong></h6>
		<div class="grid gap-4 w-full">
			{#each (serviceAccount.keys ?? []) as key, i (i)}
				<div class="input -has-icon-right">
					<input value="{key.secret}" readonly>
					<button class="icon -is-right" onclick={() => deleteKey(key.secret)} type="button" aria-label="Remove">
						<i class="fa-solid fa-trash-alt"></i>
					</button>
				</div>
			{/each}

			<div class="grid gap-4 w-full">
				<button class="button mx-auto" class:loading={loadingCreateKey} onclick={createKey} disabled={loadingCreateKey} type="button">
					<i class="fa-solid fa-plus mr-3"></i>
					Create key
				</button>
			</div>
		</div>

		<hr>

		<div class="flex">
			<button class="button" type="button" onclick={deleteItem}>
				Delete
			</button>
		</div>
	</div>
</div>
