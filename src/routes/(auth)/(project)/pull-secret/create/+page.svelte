<script>
	import { goto } from '$app/navigation'
	import validUrl from 'valid-url'
	import modal from '$lib/modal'
	import api from '$lib/api'

	export let data
	const { locations } = data
	$: ({ project } = data)

	const form = {
		name: '',
		location: '',
		server: 'https://index.docker.io/v2/',
		username: '',
		password: ''
	}

	let saving
	async function save () {
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

<div>
	<ul class="breadcrumb">
		<li>
			<a href={`/pull-secret?project=${project}`} class="link"><h6>Pull Secrets</h6></a>
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
			<h3 class="_mgr-24px _mgbt-16px _mgbt-0px-lg"><strong>Create pull secret</strong></h3>
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
					<option value="" disabled selected>Select Location</option>
					{#each locations as it}
						<option value={it.id}>{it.id}</option>
					{/each}
				</select>
			</div>
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

		<button class="button _mgr-at" class:-loading={saving}>Save</button>
	</form>
</div>
