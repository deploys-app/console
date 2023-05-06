<script>
	import format from '$lib/format'
	import { onMount } from 'svelte'
	import ClipboardJS from 'clipboard'
	import { goto } from '$app/navigation'
	import modal from '$lib/modal'
	import api from '$lib/api'

	export let data

	let workloadIdentity
	$: workloadIdentity = data.workloadIdentity

	let project
	$: project = data.project

	// export let location

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

<div>
	<ul class="breadcrumb">
		<li>
			<a href={`/workload-identity?project=${project}`} class="link"><h6>Workload Identities</h6></a>
		</li>
		<li>
			<h6>{workloadIdentity.name}</h6>
		</li>
	</ul>
</div>
<br>
<div class="panel _dp-g _gg-24px">
	<div class="lo-12 _jtfit-st _gg-12px">
		<h3><strong>Workload Identity: {workloadIdentity.name}</strong></h3>
	</div>
	<hr>
	<div class="_dp-g _gg-16px _w-100pct _mxw-512px">
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
			<label for="div-created_at">Created at</label>
			<div id="div-created_at" class="input">
				{format.datetime(workloadIdentity.createdAt)}
			</div>
		</div>
		<div class="field">
			<label for="div-created_by">Created by</label>
			<div id="div-created_by" class="input">
				{workloadIdentity.createdBy}
			</div>
		</div>
	</div>

	<hr>

	<div class="field">
		<label for="pre-command">Command</label>
		<pre id="pre-command">
			<button class="copy" data-clipboard-action="copy" data-clipboard-target="#command">copy</button>
			<code id="command">{format.gsaBinding(workloadIdentity.projectId, workloadIdentity.name, workloadIdentity.gsa, 'acoshift-1362')}</code>
		</pre>
	</div>

	<div class="_mgl-at-lg">
		<button class="button -danger" on:click={deleteItem}>Delete</button>
	</div>
</div>
