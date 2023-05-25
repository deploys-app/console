<script>
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	export let data

	const billingAccount = data.billingAccount

	const form = {
		name: billingAccount?.name || '',
		taxId: billingAccount?.taxId || '',
		taxName: billingAccount?.taxName || '',
		taxAddress: billingAccount?.taxAddress || ''
	}

	let saving = false
	async function save () {
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

<div>
	<ul class="breadcrumb">
		<li>
			<a href="/billing" class="link"><h6>Billing</h6></a>
		</li>
		{#if billingAccount}
			<li>
				<a href={`/billing/detail?id=${billingAccount.id}`} class="link"><h6>{billingAccount.name}</h6></a>
			</li>
			<li>
				<h6>Update</h6>
			</li>
		{:else}
			<li>
				<h6>Create</h6>
			</li>
		{/if}
	</ul>
</div>

<br>

<div class="panel _dp-g _g-7">
	<div class="lo-12 _g-5">
		<div class="_dp-f _alit-ct">
			<h3 class="_mgr-7 _mgbt-6 _mgbt-0:lg"><strong>Account information</strong></h3>
		</div>
	</div>
	<hr>
	<form class="_dp-g _g-6 _w-100pct _mxw-512px" on:submit|preventDefault={save}>
		<div class="field">
			<label for="input-name">Account name</label>
			<div class="input">
				<input id="input-name" bind:value={form.name} required>
			</div>
		</div>

		<h4 class="_mgbt-5">Billing Information</h4>

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

		<button class="button _mgr-at" class:-loading={saving}>Save</button>
	</form>
</div>
