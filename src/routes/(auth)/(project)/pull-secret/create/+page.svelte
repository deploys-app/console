<script>
	import { goto } from '$app/navigation'
	import validUrl from 'valid-url'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()

	const project = $derived(data.project)
	const locations = data.locations

	const form = $state({
		name: '',
		location: '',
		server: 'https://index.docker.io/v2/',
		username: '',
		password: ''
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
			if (!validUrl.isWebUri(form.server)) {
				throw new Error('server must be an url')
			}

			const resp = await api.invoke('pullSecret.create', {
				project,
				location: form.location,
				name: form.name,
				spec: {
					server: form.server,
					username: form.username,
					password: form.password
				}
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			goto(`/pull-secret?project=${project}`)
		} catch (e) {
			modal.error({ error: e })
		} finally {
			saving = false
		}
	}
</script>

<div class="nm-breadcrumb">
	<div class="nm-breadcrumb-item">
		<a href={`/pull-secret?project=${project}`} class="nm-link"><h6>Pull Secrets</h6></a>
	</div>
	<div class="nm-breadcrumb-item">
		<h6>Create</h6>
	</div>
</div>

<br>
<div class="nm-panel is-level-300 _dp-g _g-7">
	<div class="lo-12 _g-5">
		<div class="_dp-f _alit-ct">
			<h3 class="_mgr-7 _mgbt-6 _mgbt-0:lg"><strong>Create pull secret</strong></h3>
		</div>
	</div>

	<hr>

	<form class="_dp-g _g-6 _w-100pct" onsubmit={save}>
		<div class="nm-field">
			<label for="input-name">Name</label>
			<div class="nm-input">
				<input id="input-name" placeholder="name" bind:value={form.name}>
			</div>
		</div>
		<div class="nm-field">
			<label for="input-location">Location</label>
			<div class="nm-select">
				<select id="input-location" bind:value={form.location} required>
					<option value="" disabled selected>Select Location</option>
					{#each locations as it}
						<option value={it.id}>{it.id}</option>
					{/each}
				</select>
			</div>
		</div>
		<div class="nm-field">
			<label for="input-server">Server</label>
			<div class="nm-input">
				<input id="input-server" bind:value={form.server} placeholder="https://index.docker.io/v2/">
			</div>
		</div>
		<div class="nm-field">
			<label for="input-username">Username</label>
			<div class="nm-input">
				<input id="input-username" bind:value={form.username} placeholder="username or &quot;_json_key&quot;">
			</div>
		</div>
		<div class="nm-field">
			<label for="input-password">Password</label>
			<div class="nm-input">
				<input id="input-password" type="password" bind:value={form.password} placeholder="password or service account json">
			</div>
		</div>

		<hr>

		<button class="nm-button _mgr-at" class:is-loading={saving}>Save</button>
	</form>
</div>
