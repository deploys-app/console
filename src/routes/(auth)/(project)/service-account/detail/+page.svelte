<script lang="ts">
	import { onMount, getContext } from 'svelte'
	import { goto } from '$app/navigation'
	import * as format from '$lib/format'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import DangerZone from '$lib/components/DangerZone.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import { setupCopy } from '$lib/clipboard'
	import { denyTooltip } from '$lib/permission'
	import type { PageData } from './$types'

	const { can } = getContext('permission') as { can: (p: string) => boolean }

	onMount(() => setupCopy('.copy'))

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const id = $derived(data.id)
	// serviceAccount.get returns the account plus its issued keys; the keys array
	// isn't part of the shared Api.ServiceAccount shape, so widen it locally.
	const serviceAccount = $derived(
		data.serviceAccount as Api.ServiceAccount & { keys?: { secret: string }[] }
	)

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

	function deleteKey (secret: string) {
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

<div class="page-head">
	<div>
		<h4><strong>Service account</strong></h4>
		<p class="page-sub">Programmatic identity and its API keys.</p>
	</div>
</div>

<div class="panel is-level-300 grid gap-6">
	<div class="grid gap-4 w-full">
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
				<input id="input-created_at" value={format.datetime(serviceAccount.createdAt)} readonly>
			</div>
		</div>
		<div class="field">
			<label for="input-created_by">Created By</label>
			<div class="input">
				<input id="input-created_by" value={serviceAccount.createdBy} readonly>
			</div>
		</div>

		<hr>

		<h6><strong>Keys</strong></h6>
		<div class="grid gap-4 w-full">
			{#each (serviceAccount.keys ?? []) as key, i (i)}
				<div class="flex items-center gap-2">
					<div class="input -has-icon-right flex-1">
						<input value={key.secret} readonly>
						<span class="icon -is-right copy" data-clipboard-text={key.secret} aria-label="Copy">
							<i class="fa-light fa-copy"></i>
						</span>
					</div>
					<GuardedButton permission="serviceaccount.key.delete" class="icon" onclick={() => deleteKey(key.secret)} type="button" aria-label="Delete">
						<i class="fa-solid fa-trash-alt"></i>
					</GuardedButton>
				</div>
			{/each}

			<div class="grid gap-4 w-full">
				<span class="inline-flex mx-auto" title={can('serviceaccount.key.create') ? null : denyTooltip('serviceaccount.key.create')}>
					<button class="button" class:loading={loadingCreateKey} onclick={createKey} disabled={!can('serviceaccount.key.create') || loadingCreateKey} type="button">
						<i class="fa-solid fa-plus mr-3"></i>
						Create key
					</button>
				</span>
			</div>
		</div>

		<DangerZone description="Permanently delete this service account and revoke all of its keys.">
			<GuardedButton permission="serviceaccount.delete" class="button is-variant-negative" type="button" onclick={deleteItem}>
				Delete
			</GuardedButton>
		</DangerZone>
	</div>
</div>
