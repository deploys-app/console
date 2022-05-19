<script context="module">
	import api from '$lib/api'
</script>

<script>
	import { goto } from '$app/navigation'

	let form = {
		name: '',
		taxId: '',
		taxName: '',
		taxAddress: ''
	}

	let saving
	async function save () {
		if (saving) {
			return
		}

		saving = true
		try {
			const resp = await api.invoke('billing.create', {
				name: form.name,
				taxId: form.taxId,
				taxName: form.taxName,
				taxAddress: form.taxAddress
			}, fetch)
			if (!resp.ok) {
				window.dispatchEvent(new CustomEvent('error', {
					detail: {
						error: resp.error
					}
				}))
				return
			}
			goto('/billing')
		} finally {
			saving = false
		}
	}
</script>

<div>
	<ul class="moon-breadcrumb">
		<li>
			<a href="/billing" class="moon-link"><h6>Billing</h6></a>
		</li>
		<li>
			<h6>Create</h6>
		</li>
	</ul>
</div>

<br>

<div class="moon-panel _dp-g _gg-24px">
	<div class="lo-12 _gg-12px">
		<div class="_dp-f _alit-ct">
			<h3 class="_mgr-24px _mgbt-16px _mgbt-0px-lg"><strong>Account information</strong></h3>
		</div>
	</div>
	<hr>
	<form class="_dp-g _gg-16px _w-100pct _mxw-512px" on:submit|preventDefault={save}>
		<div class="moon-field">
			<label for="input-name">Account name</label>
			<div class="moon-input">
				<input id="input-name" bind:value={form.name} required>
			</div>
		</div>

		<h4 class="_mgt-30px _mgbt-12px">Billing Information</h4>

		<div class="moon-field">
			<label for="input-tax-id">Tax ID</label>
			<div class="moon-input">
				<input id="input-tax-id" bind:value={form.taxId} required>
			</div>
		</div>

		<div class="moon-field">
			<label for="input-tax-name">Name</label>
			<div class="moon-input">
				<input id="input-tax-name" bind:value={form.taxName} required>
			</div>
		</div>

		<div class="moon-field">
			<label for="input-tax-address">Address</label>
			<div class="moon-input">
				<input id="input-tax-address" bind:value={form.taxAddress} required>
			</div>
		</div>

		<hr>

		<button class="moon-button _mgr-at">Save</button>
	</form>
</div>
