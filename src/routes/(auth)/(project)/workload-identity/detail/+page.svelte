<script>
	import * as format from '$lib/format'
	import { onMount } from 'svelte'
	import { setupCopy } from '$lib/clipboard'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import DangerZone from '$lib/components/DangerZone.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'

	const { data } = $props()

	const workloadIdentity = $derived(data.workloadIdentity)
	const project = $derived(data.project)
	const projectInfo = $derived(data.projectInfo)

	onMount(() => {
		return setupCopy('.copy')
	})

	function deleteItem () {
		modal.confirm({
			title: `Delete "${workloadIdentity.name}"?`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('workloadIdentity.delete', {
					project,
					location: workloadIdentity.location,
					name: workloadIdentity.name
				}, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				await goto(`/workload-identity?project=${project}`)
			}
		})
	}
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/workload-identity?project=${project}`} class="link"><h6>Workload Identities</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6>{workloadIdentity.name}</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div>
		<h4><strong>Workload identity</strong></h4>
		<p class="page-sub">Maps this workload to a Google service account for GCP access.</p>
	</div>
</div>

<div class="panel is-level-300 grid gap-6">
	<div class="grid gap-4 w-full">
		<div class="field">
			<label for="input-gsa">GSA</label>
			<div class="input">
				<input id="input-gsa" value={workloadIdentity.gsa} readonly disabled>
			</div>
		</div>
		<div class="field">
			<label for="input-location">Location</label>
			<div class="input">
				<input id="input-location" value={workloadIdentity.location} readonly disabled>
			</div>
		</div>
		<div class="field">
			<label for="input-created_at">Created at</label>
			<div class="input">
				<input id="input-created_at" value={format.datetime(workloadIdentity.createdAt)} readonly disabled>
			</div>
		</div>
		<div class="field">
			<label for="input-created_by">Created by</label>
			<div class="input">
				<input id="input-created_by" value={workloadIdentity.createdBy} readonly disabled>
			</div>
		</div>

		<hr>

		<div class="field">
			<label for="pre-command">Command</label>
			<pre id="pre-command">
				<button class="copy" data-clipboard-action="copy" data-clipboard-target="#command">copy</button>
				{#if projectInfo}
					<code id="command">{format.gsaBinding(projectInfo.id, workloadIdentity.name, workloadIdentity.gsa, 'acoshift-1362')}</code>
				{/if}
			</pre>
		</div>

		<DangerZone description="Permanently delete this workload identity. Deployments using it will lose GCP access.">
			<GuardedButton permission="workloadIdentity.delete" class="button is-variant-negative" onclick={deleteItem}>Delete</GuardedButton>
		</DangerZone>
	</div>
</div>
