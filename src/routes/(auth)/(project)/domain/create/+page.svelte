<script>
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()
	const {
		project,
		locations,
		projectInfo
	} = data

	const form = $state({
		domain: '',
		location: '',
		cdn: false,
		wildcard: false
	})

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

<div class="nm-breadcrumb">
	<div class="nm-breadcrumb-item">
		<a href={`/domain?project=${project}`} class="nm-link"><h6>Domains</h6></a>
	</div>
	<div class="nm-breadcrumb-item">
		<h6>Create</h6>
	</div>
</div>

<br>

<div class="nm-panel is-level-300 _dp-g _g-7">
	<div class="lo-12 _g-5">
		<div class="_dp-f _alit-ct">
			<h3 class="_mgr-7 _mgbt-6 _mgbt-0:lg"><strong>Create domain</strong></h3>
		</div>
	</div>
	<hr>
	<form class="_dp-g _g-6 _w-100pct" onsubmit={save}>
		<div class="nm-field">
			<label for="input-domain">Domain</label>
			<div class="nm-input">
				<input id="input-domain" bind:value={form.domain}>
			</div>
		</div>
		<div class="nm-field">
			<label for="input-location">Location</label>
			<div class="nm-select">
				<select id="input-location" bind:value={form.location} required>
					<option value="" selected disabled>Select Location</option>
					{#each locations as it}
						<option value={it.id}>{it.id}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="nm-field _mgt-5">
			<h6><strong>Advanced Settings</strong></h6>
		</div>

		<div class="nm-field">
			<div class="nm-checkbox">
				<input id="input-wildcard" type="checkbox" bind:checked={form.wildcard}>
				<label for="input-wildcard">Wildcard</label>
			</div>
		</div>
		<div class="nm-field">
			<div class="nm-checkbox">
				<input id="input-cdn" type="checkbox" bind:checked={form.cdn} disabled={!projectInfo.config.domainAllowDisableCdn}>
				<label for="input-cdn">CDN (DDoS Protection)</label>
			</div>
		</div>

		<hr>

		<button class="nm-button _mgr-at" class:is-loading={saving}>Save</button>
	</form>
</div>

