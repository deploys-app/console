<script context="module">
	import api from '$lib/api'

	export async function load ({ stuff, fetch }) {
		const { project } = stuff

		const [locations, projectInfo] = await Promise.all([
			api.invoke('location.list', { project }, fetch),
			api.invoke('project.get', { project }, fetch)
		])

		if (!locations.ok) {
			return {
				status: 500,
				error: `locations: ${locations.error.message}`
			}
		}
		if (!projectInfo.ok) {
			return {
				status: 500,
				error: `project: ${project.error.message}`
			}
		}

		return {
			props: {
				locations: locations.result.items || [],
				projectInfo: projectInfo.result
			}
		}
	}
</script>

<script>
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import modal from '$lib/modal'

	export let locations
	export let projectInfo

	$: project = $page.stuff.project

	const form = {
		domain: '',
		location: '',
		type: ''
	}

	let saving
	async function save () {
		if (saving) {
			return
		}

		saving = true
		try {
			const resp = await api.invoke('domain.create', {
				project,
				location: form.location,
				domain: form.domain,
				type: form.type
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			goto(`/domain/detail?project=${project}&domain=${form.domain}`)
		} finally {
			saving = false
		}
	}
</script>

<div>
	<ul class="breadcrumb">
		<li>
			<a href={`/domain?project=${project}`} class="link"><h6>Domains</h6></a>
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
			<h3 class="_mgr-24px _mgbt-16px _mgbt-0px-lg"><strong>Create domain</strong></h3>
		</div>
	</div>
	<hr>
	<form class="_dp-g _gg-16px _w-100pct _mxw-512px" on:submit|preventDefault={save}>
		<div class="field">
			<label for="input-domain">Domain</label>
			<div class="input">
				<input id="input-domain" bind:value={form.domain}>
			</div>
		</div>
		<div class="field _mgbt-20px">
			<label for="input-location">Location</label>
			<div class="select">
				<select id="input-location" bind:value={form.location} required>
					<option value="" selected disabled>Select Location</option>
					{#each locations as it}
						<option value={it.id}>{it.id}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="field _mgbt-20px">
			<label for="input-target_prefix">Type</label>
			<div class="select">
				<select id="input-target_prefix" bind:value={form.type} required>
					<option value="" selected disabled>Select Type</option>
					{#if projectInfo.config.domainCloudflare}
						<option value="cloudflare">Cloudflare</option>
					{/if}
					<option value="hostname">Hostname</option>
					<option value="wildcard">Wildcard</option>
				</select>
			</div>
		</div>

		<hr>

		<button class="button _mgr-at" class:-loading={saving}>Save</button>
	</form>
</div>

