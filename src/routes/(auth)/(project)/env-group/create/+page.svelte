<script>
	import { onMount, untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

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

	function deleteItem () {
		if (!envGroup) return

		modal.confirm({
			title: `Delete "${envGroup.name}"?`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('envGroup.delete', {
					project,
					name: envGroup.name
				}, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				await goto(`/env-group?project=${project}`)
			}
		})
	}

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

<div class="nm-breadcrumb">
	<div class="nm-breadcrumb-item">
		<a href={`/env-group?project=${project}`} class="nm-link"><h6>Env Groups</h6></a>
	</div>
	{#if envGroup}
		<div class="nm-breadcrumb-item">
			<h6>{envGroup.name}</h6>
		</div>
		<div class="nm-breadcrumb-item">
			<h6>Update</h6>
		</div>
	{:else}
		<div class="nm-breadcrumb-item">
			<h6>Create</h6>
		</div>
	{/if}
</div>

<br>

<div class="nm-panel is-level-300 grid gap-4">
	<div class="grid grid-cols-1 gap-3">
		<h3><strong>
			{#if envGroup}
				Update env group "{envGroup.name}"
			{:else}
				Create new env group
			{/if}
		</strong></h3>
	</div>

	<hr>

	<form class="grid gap-4 w-full" onsubmit={save}>
		<div class="nm-field">
			<label for="input-name">Name</label>
			<div class="nm-input">
				<input id="input-name" placeholder="name" bind:value={form.name} required readonly={!!envGroup}>
			</div>
		</div>

		<br>
		<hr>
		<br>

		<h6><strong>Environment Variables</strong></h6>
		<div>
			<div class="nm-table-container">
				<table class="nm-table">
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
									<div class="nm-input">
										<input bind:value={it.k} placeholder="Variable name" onchange={parseEnvValue}>
									</div>
								</td>
								<td class="p-0 pl-3">:</td>
								<td class="pl-3">
									<div class="nm-input">
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
								<button class="nm-button flex m-auto" type="button"
									onclick={() => { form.env = [...form.env, { k: '', v: '' }]; parseEnvValue() }}>
									<i class="fa-solid fa-plus mr-3"></i>
									<span>Add Variable</span>
								</button>
							</td>
						</tr>
					</tfoot>
				</table>
			</div>

			<button class="nm-button flex m-auto" type="button" onclick={() => showEnvText = !showEnvText}>
				{#if showEnvText}Hide{:else}Show{/if}&nbsp;Text Editor
			</button>
			{#if showEnvText}
				<div class="nm-textarea mt-3">
					<textarea rows="20" bind:value={envText} onchange={parseEnvText}></textarea>
				</div>
			{/if}
		</div>

		<hr>

		<div class="flex gap-4">
			<button class="nm-button" class:is-loading={saving}>
				{#if envGroup}Update{:else}Create{/if}
			</button>
			{#if envGroup}
				<button class="nm-button" type="button" onclick={deleteItem}>Delete</button>
			{/if}
		</div>
	</form>
</div>
