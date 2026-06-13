<script>
	import { goto } from '$app/navigation'
	import * as format from '$lib/format'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import DangerZone from '$lib/components/DangerZone.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import Secret from '$lib/components/Secret.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const envGroup = $derived(data.envGroup)
	const entries = $derived(Object.entries(envGroup.env ?? {}))

	let showAllEnv = $state(false)

	function deleteItem () {
		modal.confirm({
			title: `Delete "${envGroup.name}"?`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('envGroup.delete', { project, name: envGroup.name }, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				await goto(`/env-group?project=${project}`)
			}
		})
	}
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/env-group?project=${project}`} class="link"><h6>Env Groups</h6></a>
	</div>
	<div class="breadcrumb-item min-w-0">
		<h6 class="min-w-0 wrap-anywhere">{envGroup.name}</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div class="min-w-0">
		<h4 class="min-w-0 wrap-anywhere"><strong>{envGroup.name}</strong></h4>
		<p class="page-sub">{entries.length} {entries.length === 1 ? 'variable' : 'variables'}</p>
	</div>
	<GuardedButton permission="envgroup.update" class="button is-variant-secondary is-icon-left"
		href={`/env-group/create?project=${project}&name=${encodeURIComponent(envGroup.name)}`}>
		<i class="fa-solid fa-pen"></i>
		Edit
	</GuardedButton>
</div>

<div class="panel is-level-300 grid gap-6">
	<div class="grid gap-4 w-full">
		<div class="field">
			<label for="input-name">Name</label>
			<div class="input">
				<input id="input-name" value={envGroup.name} readonly disabled>
			</div>
		</div>
		<div class="field">
			<label for="input-created_at">Created at</label>
			<div class="input">
				<input id="input-created_at" value={format.datetime(envGroup.createdAt)} readonly disabled>
			</div>
		</div>
		<div class="field">
			<label for="input-created_by">Created by</label>
			<div class="input">
				<input id="input-created_by" value={envGroup.createdBy} readonly disabled>
			</div>
		</div>

		<hr>

		<div class="flex items-center justify-between gap-3 flex-wrap">
			<div>
				<h6><strong>Environment Variables</strong></h6>
				<p class="text-content/50 text-sm mt-1">
					Variables injected into deployments that reference this group.
				</p>
			</div>
			{#if entries.length}
				<button type="button" class="button is-variant-secondary is-size-small is-icon-left"
					onclick={() => showAllEnv = !showAllEnv}>
					<i class="fa-solid {showAllEnv ? 'fa-eye-slash' : 'fa-eye'}"></i>
					{showAllEnv ? 'Hide all' : 'Show all'}
				</button>
			{/if}
		</div>

		<div class="table-container">
			<table class="table is-variant-compact">
				<thead>
					<tr>
						<th class="is-collapse" style="min-width: 256px">Key</th>
						<th>Value</th>
					</tr>
				</thead>
				<tbody>
					{#each entries as [k, v] (k)}
						<tr>
							<td>{k}</td>
							<td><Secret value={v} show={showAllEnv} /></td>
						</tr>
					{:else}
						<tr>
							<td colspan="2" class="text-center text-content/50">This env group has no variables.</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<DangerZone description="Permanently delete this env group. Deployments referencing it may fail to start.">
			<GuardedButton permission="envgroup.delete" class="button is-variant-negative" type="button" onclick={deleteItem}>Delete</GuardedButton>
		</DangerZone>
	</div>
</div>
