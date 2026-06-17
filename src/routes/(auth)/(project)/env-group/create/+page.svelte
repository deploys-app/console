<script lang="ts">
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import type { PageData } from './$types'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import EnvVarEditor from '$lib/components/EnvVarEditor.svelte'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const envGroup = $derived(data.envGroup)

	const form = $state(untrack(() => ({
		name: envGroup?.name ?? '',
		env: Object.entries(envGroup?.env ?? {}).map(([k, v]) => ({ k, v }))
	})))

	let saving = $state(false)
	// Which save button is in flight, so only that one shows the spinner:
	// 'redeploy' (Update and redeploy), 'update' (Update, no redeploy), or
	// 'create'. Empty when idle.
	let savingAction = $state('')

	// redeploy: on update, whether to redeploy the deployments that reference this
	// group so they pick up the new values. Ignored on create.
	async function save (e: Event, redeploy = true) {
		e.preventDefault()

		if (saving) {
			return
		}

		saving = true
		savingAction = envGroup ? (redeploy ? 'redeploy' : 'update') : 'create'
		try {
			const env = form.env.reduce<Record<string, string>>((p, x) => {
				if (x.k) p[x.k] = x.v
				return p
			}, {})

			const fn = envGroup ? 'envgroup.update' : 'envgroup.create'
			const args: { project: string, name: string, env: Record<string, string>, redeploy?: boolean } = { project, name: form.name, env }
			if (envGroup) {
				args.redeploy = redeploy
			}
			const resp = await api.invoke(fn, args, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			await goto(`/env-group?project=${project}`)
		} finally {
			saving = false
			savingAction = ''
		}
	}
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
	<form class="grid gap-4 w-full" onsubmit={(e) => save(e, true)}>
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
		<EnvVarEditor bind:entries={form.env} />

		<hr>

		<div class="flex gap-4 items-center flex-wrap">
			{#if envGroup}
				<GuardedButton permission={['envgroup.update', 'deployment.deploy']} type="submit" class="button"
					loading={saving && savingAction === 'redeploy'} disabled={saving}>
					Update and redeploy
				</GuardedButton>
				<GuardedButton permission="envgroup.update" type="button" class="button is-variant-secondary"
					loading={saving && savingAction === 'update'} disabled={saving}
					onclick={(e) => save(e, false)}>
					Update
				</GuardedButton>
				<p class="text-content/50 text-sm">
					“Update and redeploy” rolls the new values out to deployments that use this group.
					“Update” saves them without redeploying.
				</p>
			{:else}
				<GuardedButton permission="envgroup.create" type="submit" class="button" loading={saving}>
					Create
				</GuardedButton>
			{/if}
		</div>
	</form>
</div>
