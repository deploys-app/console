<script>
	import { goto } from '$app/navigation'
	import * as format from '$lib/format'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	export let data

	$: project = data.project
	$: id = data.id
	$: serviceAccount = data.serviceAccount

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

	let loadingCreateKey = false

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

<div class="nm-breadcrumb">
	<div class="nm-breadcrumb-item">
		<a href={`/service-account?project=${project}`} class="nm-link"><h6>Service Accounts</h6></a>
	</div>
	<div class="nm-breadcrumb-item">
		<h6>{serviceAccount.name}</h6>
	</div>
</div>

<br>

<div class="nm-panel is-level-300 _dp-g _g-7">
	<div class="lo-12 _g-5">
		<div class="_dp-g _g-6 _gatf-r _gatf-cl:lg _jtfct-spbtw">
			<h3 class="_mgr-7 _mgbt-6 _mgbt-0:lg">
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

	<div class="content _dp-g _g-6 _w-100pct">
		<div class="nm-field">
			<label for="input-email">Email</label>
			<div class="nm-input">
				<input id="input-email" value={serviceAccount.email} readonly>
			</div>
		</div>
		<div class="nm-field">
			<label for="input-name">Name</label>
			<div class="nm-input">
				<input id="input-name" value={serviceAccount.name} readonly>
			</div>
		</div>
		<div class="nm-field">
			<label for="input-description">Description</label>
			<div class="nm-textarea">
				<textarea id="input-description" rows="5" readonly>{serviceAccount.description}</textarea>
			</div>
		</div>
		<div class="nm-field">
			<label for="input-created_at">Created At</label>
			<div class="nm-input">
				<input id="input-created_at" value="{format.datetime(serviceAccount.createdAt)}" readonly>
			</div>
		</div>
		<div class="nm-field">
			<label for="input-created_by">Created By</label>
			<div class="nm-input">
				<input id="input-created_by" value="{serviceAccount.createdBy}" readonly>
			</div>
		</div>

		<hr>

		<h6><strong>Keys</strong></h6>
		<div class="_dp-g _g-6 _w-100pct">
			{#each (serviceAccount.keys ?? []) as key}
				<div class="nm-input -has-icon-right">
					<input value="{key.secret}" readonly>
					<button class="icon-button icon -is-right" on:click={() => deleteKey(key.secret)} type="button">
						<i class="fa-solid fa-trash-alt"></i>
					</button>
				</div>
			{/each}

			<div class="_dp-g _g-6 _w-100pct">
				<button class="button -small _mgh-at" class:loading={loadingCreateKey} on:click={createKey} disabled={loadingCreateKey} type="button">
					<i class="fa-solid fa-plus _mgr-5"></i>
					Create key
				</button>
			</div>
		</div>
	</div>
</div>
