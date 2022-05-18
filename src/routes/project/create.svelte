<script context="module">
	import api from '$lib/api'

	export async function load ({ fetch }) {
		const billingAccounts = await api.invoke('billing.list', {}, fetch)
		if (!billingAccounts.ok) {
			return {
				status: 500,
				error: `billingAccounts: ${billingAccounts.error.message}`
			}
		}

		return {
			props: {
				billingAccounts: billingAccounts.result.billings || []
			}
		}
	}
</script>

<script>
	export let billingAccounts

	let sid
	let name
	let billingId

	function createProject () {
		api.invoke('project.create', {
			sid,
			name,
			billingAccount: billingId
		}, fetch)
	}
</script>

<div>
	<ul class="moon-breadcrumb">
		<li>
			<a href="/project" class="moon-link"><h6>Projects</h6></a>
		</li>
		<li>
			<h6>Create</h6>
		</li>
	</ul>
</div>
<br>
<div class="moon-panel _dp-g _gg-24px">
	<div class="lo-12 _jtfit-st _gg-12px">
		<a class="moon-link" href="/project">
            <small><i class="far fa-arrow-left"></i>&nbsp;Back</small>
		</a>
<!--		<h5><strong>Update Project: {{.Page.Project}}</strong></h5>-->
		<h5><strong>Create Project</strong></h5>
	</div>

	<hr>

	<form class="_dp-g _gg-16px _w-100pct _mxw-512px" on:submit|preventDefault={createProject}>
		<div class="moon-field">
			<label for="input-project">ID</label>
			<div class="moon-input">
				<input id="input-project" placeholder="Project ID" bind:value={sid}>
<!--				<input name="sid" id="input-project" placeholder="Project ID" value="{{.Form.SID}}" {{if .Update}}readonly{{end}}>-->
			</div>
		</div>

		<div class="moon-field">
			<label for="input-name">Name</label>
			<div class="moon-input">
				<input id="input-name" placeholder="Project name" bind:value={name} required>
			</div>
		</div>

		<div class="moon-field _mgbt-20px">
			<label for="input-billing-account">Billing Account</label>
			<div class="moon-select">
				<select id="input-billing-account" bind:value={billingId} required>
					<option value="">Select Billing Account</option>
					{#each billingAccounts as it}
						<option value={it.id}>{it.name} ({it.id})</option>
					{/each}
				</select>
			</div>
		</div>

		<button class="moon-button _mgt-16px _mgr-at">
<!--			Update Project-->
			Create Project
		</button>
	</form>
</div>
