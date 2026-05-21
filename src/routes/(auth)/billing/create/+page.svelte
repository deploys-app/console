<script>
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()

	const billingAccount = $derived(data.billingAccount)

	const form = $state(untrack(() => ({
		name: billingAccount?.name || '',
		taxId: billingAccount?.taxId || '',
		taxName: billingAccount?.taxName || '',
		taxAddress: billingAccount?.taxAddress || ''
	})))

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
		const fn = billingAccount ? 'billing.update' : 'billing.create'
		try {
			const resp = await api.invoke(fn, {
				id: billingAccount?.id || undefined,
				name: form.name,
				taxId: form.taxId,
				taxName: form.taxName,
				taxAddress: form.taxAddress
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			goto('/billing')
		} finally {
			saving = false
		}
	}
</script>

<div class="nm-breadcrumb">
	<div class="nm-breadcrumb-item">
		<a href="/billing" class="nm-link"><h6>Billing</h6></a>
	</div>
	{#if billingAccount}
		<div class="nm-breadcrumb-item">
			<a href={`/billing/detail?id=${billingAccount.id}`} class="nm-link"><h6>{billingAccount.name}</h6></a>
		</div>
		<div class="nm-breadcrumb-item">
			<h6>Update</h6>
		</div>
	{:else}
		<div class="nm-breadcrumb-item">
			<h6>Create</h6>
		</div>
	{/if}
</div>

<br>

<div class="nm-panel is-level-300 grid gap-6">
	<div class="grid grid-cols-1 gap-3">
		<div class="flex items-center">
			<h3 class="mr-6 mb-4 xl:mb-0"><strong>Account information</strong></h3>
		</div>
	</div>
	<hr>
	<form class="grid gap-4 w-full" onsubmit={save}>
		<div class="nm-field">
			<label for="input-name">Account name</label>
			<div class="nm-input">
				<input id="input-name" bind:value={form.name} required>
			</div>
		</div>

		<h4 class="mb-3">Billing Information</h4>

		<div class="nm-field">
			<label for="input-tax_id">Tax ID</label>
			<div class="nm-input">
				<input id="input-tax_id" bind:value={form.taxId} required>
			</div>
		</div>

		<div class="nm-field">
			<label for="input-tax_name">Name</label>
			<div class="nm-input">
				<input id="input-tax_name" bind:value={form.taxName} required>
			</div>
		</div>

		<div class="nm-field">
			<label for="input-tax_address">Address</label>
			<div class="nm-input">
				<input id="input-tax_address" bind:value={form.taxAddress} required>
			</div>
		</div>

		<hr>

		<button class="nm-button mr-auto" class:is-loading={saving}>Save</button>
	</form>
</div>
