<script>
	import * as format from '$lib/format'
	import { onMount } from 'svelte'
	import ClipboardJS from 'clipboard'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()

	const workloadIdentity = $derived(data.workloadIdentity)
	const project = $derived(data.project)
	const projectInfo = $derived(data.projectInfo)

	onMount(() => {
		const copyList = new ClipboardJS('.copy')
		return () => {
			copyList.destroy()
		}
	})

	function deleteItem () {
		modal.confirm({
			title: `Delete "${workloadIdentity.name}" ?`,
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

<div class="nm-breadcrumb">
	<div class="nm-breadcrumb-item">
		<a href={`/workload-identity?project=${project}`} class="nm-link"><h6>Workload Identities</h6></a>
	</div>
	<div class="nm-breadcrumb-item">
		<h6>{workloadIdentity.name}</h6>
	</div>
</div>

<br>
<div class="nm-panel is-level-300 _dp-g _g-7">
	<div class="lo-12 _jtfit-st _g-5">
		<h3><strong>Workload Identity: {workloadIdentity.name}</strong></h3>
	</div>
	<hr>
	<div class="content _dp-g _g-6 _w-100pct">
		<div class="nm-field">
			<label for="input-gsa">GSA</label>
			<div class="nm-input">
				<input id="input-gsa" value={workloadIdentity.gsa} readonly disabled>
			</div>
		</div>
		<div class="nm-field">
			<label for="input-location">Location</label>
			<div class="nm-input">
				<input id="input-location" value={workloadIdentity.location} readonly disabled>
			</div>
		</div>
		<div class="nm-field">
			<label for="div-created_at">Created at</label>
			<div id="div-created_at" class="nm-input">
				{format.datetime(workloadIdentity.createdAt)}
			</div>
		</div>
		<div class="nm-field">
			<label for="div-created_by">Created by</label>
			<div id="div-created_by" class="nm-input">
				{workloadIdentity.createdBy}
			</div>
		</div>

		<hr>

		<div class="nm-field">
			<label for="pre-command">Command</label>
			<pre id="pre-command">
				<button class="copy" data-clipboard-action="copy" data-clipboard-target="#command">copy</button>
				{#if projectInfo}
					<code id="command">{format.gsaBinding(projectInfo.id, workloadIdentity.name, workloadIdentity.gsa, 'acoshift-1362')}</code>
				{/if}
			</pre>
		</div>

		<hr>

		<div class="_dp-f _g-6">
			<button class="nm-button" onclick={deleteItem}>Delete</button>
		</div>
	</div>
</div>
