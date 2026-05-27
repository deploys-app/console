<script>
	import { goto } from '$app/navigation'
	import validUrl from 'valid-url'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import Select from '$lib/components/Select.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const locations = $derived(data.locations)

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

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/pull-secret?project=${project}`} class="link"><h6>Pull Secrets</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6>Create</h6>
	</div>
</div>

<br>
<div class="page-head">
	<div>
		<h4><strong>Create pull secret</strong></h4>
		<p class="page-sub">Registry credentials used to pull private images.</p>
	</div>
</div>

<div class="panel is-level-300 grid gap-6">
	<form class="grid gap-4 w-full" onsubmit={save}>
		<div class="field">
			<label for="input-name">Name</label>
			<div class="input">
				<input id="input-name" placeholder="name" bind:value={form.name}>
			</div>
		</div>
		<div class="field">
			<label for="input-location">Location</label>
			<Select
				id="input-location"
				bind:value={form.location}
				required
				placeholder="Select Location"
				options={locations.map((it) => ({ value: it.id, label: it.id }))} />
		</div>
		<div class="field">
			<label for="input-server">Server</label>
			<div class="input">
				<input id="input-server" bind:value={form.server} placeholder="https://index.docker.io/v2/">
			</div>
		</div>
		<div class="field">
			<label for="input-username">Username</label>
			<div class="input">
				<input id="input-username" bind:value={form.username} placeholder="username or &quot;_json_key&quot;">
			</div>
		</div>
		<div class="field">
			<label for="input-password">Password</label>
			<div class="input">
				<input id="input-password" type="password" bind:value={form.password} placeholder="password or service account json">
			</div>
		</div>

		<hr>

		<button class="button mr-auto" class:is-loading={saving}>Save</button>
	</form>
</div>
