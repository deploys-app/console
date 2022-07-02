<script context="module">
	import api from '$lib/api'

	export async function load ({ stuff, fetch }) {
		const { project } = stuff

		const locations = await api.invoke('location.list', { project }, fetch)
		if (!locations.ok) {
			return {
				status: 500,
				error: `locations: ${locations.error.message}`
			}
		}

		return {
			props: {
				locations: locations.result.items || []
			}
		}
	}
</script>

<script>
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import modal from '$lib/modal'

	export let locations

	$: project = $page.stuff.project

	const form = {
		name: '',
		location: '',
		gsa: ''
	}

	let saving
	async function save () {
		if (saving) {
			return
		}

		saving = true
		try {
			const resp = await api.invoke('workloadIdentity.create', {
				project,
				location: form.location,
				name: form.name,
				gsa: form.gsa
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			goto(`/workload-identity?project=${project}`)
		} finally {
			saving = false
		}
	}
</script>

<div>
	<ul class="breadcrumb">
		<li>
			<a href={`/workload-identity?project=${project}`} class="link"><h6>Workload Identities</h6></a>
		</li>
		<li>
			<h6>Create</h6>
		</li>
	</ul>
</div>
<br>
<div class="panel _dp-g _gg-24px">
	<div class="lo-12 _gg-12px">
		<div class="_dp-f _alit-ct">
			<h3 class="_mgr-24px _mgbt-16px _mgbt-0px-lg"><strong>Create</strong></h3>
		</div>
	</div>
	<hr>
	<form class="_dp-g _gg-16px _w-100pct _mxw-512px" on:submit|preventDefault={save}>
		<div class="field">
			<label for="input-name">Name</label>
			<div class="input">
				<input id="input-name" placeholder="name" bind:value={form.name}>
			</div>
		</div>
		<div class="field _mgbt-20px">
			<label for="input-location">Location</label>
			<div class="select">
				<select id="input-location" bind:value={form.location} required>
					<option value="" selected disabled>Select Location</option>
					{#each locations as it}
						{#if it.features.workloadIdentity}
							<option value={it.id}>{it.id}</option>
						{/if}
					{/each}
				</select>
			</div>
		</div>
		<div class="field">
			<label for="input-gsa">GSA</label>
			<div class="input">
				<input id="input-gsa" placeholder="email gsa" bind:value={form.gsa}>
			</div>
		</div>
		<hr>
		<button class="button _mgr-at" class:-loading={saving}>Create</button>
	</form>

</div>
