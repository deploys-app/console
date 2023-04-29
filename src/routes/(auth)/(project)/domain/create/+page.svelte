<script>
	import { goto } from '$app/navigation'
	import modal from '$lib/modal'
	import api from '$lib/api'

	export let data
	const {
		project,
		locations,
		projectInfo
	} = data

	const form = {
		domain: '',
		location: '',
		cdn: true,
		wildcard: false
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
				cdn: form.cdn,
				wildcard: form.wildcard
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

		<div class="field _mgt-12px">
			<label>Advanced Settings</label>
		</div>

		{#if projectInfo.config.domainWildcard}
			<div class="field _mgbt-20px">
				<div class="checkbox">
					<input id="input-wildcard" type="checkbox" bind:checked={form.wildcard}>
					<label for="input-wildcard">Wildcard</label>
				</div>
			</div>
		{/if}
		<div class="field _mgbt-20px">
			<div class="checkbox">
				<input id="input-cdn" type="checkbox" bind:checked={form.cdn} disabled={!projectInfo.config.domainCloudflare}>
				<label for="input-cdn">CDN (DDoS Protection)</label>
			</div>
		</div>

		<hr>

		<button class="button _mgr-at" class:-loading={saving}>Save</button>
	</form>
</div>

