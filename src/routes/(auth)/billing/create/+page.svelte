<script lang="ts">
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const billingAccount = $derived(data.billingAccount)

	const form = $state(untrack(() => ({
		name: billingAccount?.name || '',
		taxId: billingAccount?.taxId || '',
		taxName: billingAccount?.taxName || '',
		taxAddress: billingAccount?.taxAddress || ''
	})))

	let saving = $state(false)

	async function save (e: Event) {
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

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href="/billing" class="link"><h6>Billing</h6></a>
	</div>
	{#if billingAccount}
		<div class="breadcrumb-item">
			<a href={`/billing/detail?id=${billingAccount.id}`} class="link"><h6>{billingAccount.name}</h6></a>
		</div>
		<div class="breadcrumb-item">
			<h6>Update</h6>
		</div>
	{:else}
		<div class="breadcrumb-item">
			<h6>Create</h6>
		</div>
	{/if}
</div>

<br>

<div class="page-head">
	<div>
		<h4><strong>{#if billingAccount}Edit billing account{:else}Create billing account{/if}</strong></h4>
		<p class="page-sub">Contact and tax details used on your invoices.</p>
	</div>
</div>

<div class="panel is-level-300 grid gap-6">
	<form class="grid gap-4 w-full" onsubmit={save}>
		<div class="field">
			<label for="input-name">Account name</label>
			<div class="input">
				<input id="input-name" bind:value={form.name} required>
			</div>
		</div>

		<h4 class="mb-3">Billing Information</h4>

		<div class="field">
			<label for="input-tax_id">Tax ID</label>
			<div class="input">
				<input id="input-tax_id" bind:value={form.taxId} required>
			</div>
		</div>

		<div class="field">
			<label for="input-tax_name">Name</label>
			<div class="input">
				<input id="input-tax_name" bind:value={form.taxName} required>
			</div>
		</div>

		<div class="field">
			<label for="input-tax_address">Address</label>
			<div class="input">
				<input id="input-tax_address" bind:value={form.taxAddress} required>
			</div>
		</div>

		<hr>

		<button class="button mr-auto" class:is-loading={saving}>Save</button>
	</form>
</div>
