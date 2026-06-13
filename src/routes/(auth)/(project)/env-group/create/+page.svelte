<script>
	import { onMount, untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import GuardedButton from '$lib/components/GuardedButton.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const envGroup = $derived(data.envGroup)

	const form = $state(untrack(() => ({
		name: envGroup?.name ?? '',
		env: Object.entries(envGroup?.env ?? {}).map(([k, v]) => ({ k, v }))
	})))

	let showEnvText = $state(false)
	let envText = $state('')

	function parseEnvText () {
		form.env = envText
			.split('\n')
			.filter((t) => t.length > 0)
			.map((t) => t.split('='))
			.map(([k, ...v]) => ({ k, v: v.join('=') }))
	}

	function parseEnvValue () {
		envText = form.env
			.map(({ k, v }) => `${k}=${v}`)
			.join('\n')
	}

	let saving = $state(false)

	// The submit RPC depends on whether we're editing an existing env group
	// (envGroup.update) or creating a new one (envGroup.create); gate on the one
	// the save handler will actually call.
	const savePermission = $derived(envGroup ? 'envGroup.update' : 'envGroup.create')

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
			const env = form.env.reduce((p, x) => {
				if (x.k) p[x.k] = x.v
				return p
			}, {})

			const fn = envGroup ? 'envGroup.update' : 'envGroup.create'
			const resp = await api.invoke(fn, {
				project,
				name: form.name,
				env
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			await goto(`/env-group?project=${project}`)
		} finally {
			saving = false
		}
	}

	onMount(() => {
		parseEnvValue()
	})
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/env-group?project=${project}`} class="link"><h6>Env Groups</h6></a>
	</div>
	{#if envGroup}
		<div class="breadcrumb-item">
			<a href={`/env-group/detail?project=${project}&name=${encodeURIComponent(envGroup.name)}`} class="link"><h6>{envGroup.name}</h6></a>
		</div>
		<div class="breadcrumb-item">
			<h6>Update</h6>
		</div>
	{:else}
		<div class="breadcrumb-item">
			<h6>Create</h6>
		</div>
	{/if}
</div>

<br>

<div class="page-head">
	<div>
		<h4><strong>{#if envGroup}Edit env group{:else}Create env group{/if}</strong></h4>
		<p class="page-sub">A reusable set of environment variables for deployments.</p>
	</div>
</div>

<div class="panel is-level-300 grid gap-4">
	<form class="grid gap-4 w-full" onsubmit={save}>
		<div class="field">
			<label for="input-name">Name</label>
			<div class="input">
				<input id="input-name" placeholder="name" bind:value={form.name} required readonly={!!envGroup}>
			</div>
		</div>

		<br>
		<hr>
		<br>

		<h6><strong>Environment Variables</strong></h6>
		<div>
			<div class="table-container">
				<table class="table">
					<thead>
						<tr>
							<th>Key</th>
							<th class="is-collapse p-0"></th>
							<th>Value</th>
							<th class="is-collapse is-align-right"></th>
						</tr>
					</thead>
					<tbody>
						{#each form.env as it, i (i)}
							<tr>
								<td>
									<div class="input">
										<input bind:value={it.k} placeholder="Variable name" onchange={parseEnvValue}>
									</div>
								</td>
								<td class="p-0 pl-3">:</td>
								<td class="pl-3">
									<div class="input">
										<input bind:value={it.v} placeholder="Value" onchange={parseEnvValue}>
									</div>
								</td>
								<td style="padding: 19px 12px;">
									<button class="icon-button" type="button" aria-label="Remove an environment variable"
										onclick={() => { form.env = form.env.filter((_, k) => k !== i); parseEnvValue() }}>
										<i class="fa-solid fa-trash-alt"></i>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
					<tfoot>
						<tr>
							<td colspan="4">
								<button class="button is-variant-secondary flex m-auto" type="button"
									onclick={() => { form.env = [...form.env, { k: '', v: '' }]; parseEnvValue() }}>
									<i class="fa-solid fa-plus mr-3"></i>
									<span>Add Variable</span>
								</button>
							</td>
						</tr>
					</tfoot>
				</table>
			</div>

			<button class="button is-variant-secondary flex m-auto" type="button" onclick={() => showEnvText = !showEnvText}>
				{#if showEnvText}Hide{:else}Show{/if}&nbsp;Text Editor
			</button>
			{#if showEnvText}
				<div class="textarea mt-3">
					<textarea rows="20" bind:value={envText} onchange={parseEnvText}></textarea>
				</div>
			{/if}
		</div>

		<hr>

		<div class="flex gap-4">
			<GuardedButton permission={savePermission} type="submit" class="button" loading={saving}>
				{#if envGroup}Update{:else}Create{/if}
			</GuardedButton>
		</div>
	</form>
</div>
