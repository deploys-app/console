<script context="module">
	import api from '$lib/api'

	export async function load ({ url, stuff, fetch }) {
		const { project } = stuff
		const location = url.searchParams.get('location')
		const name = url.searchParams.get('name')

		const [locationData, workloadIdentity] = await Promise.all([
			api.invoke('location.get', { project, id: location }, fetch),
			api.invoke('workloadIdentity.get', { project, location, name }, fetch)
		])

		if (!locationData.ok || !workloadIdentity.ok) {
			if (locationData.error?.notFound || workloadIdentity.error?.notFound) {
				return {
					status: 302,
					redirect: `/workload-identity?project=${project}`
				}
			}
			return {
				status: 500,
				error: `location: ${location.error?.message}, workloadIdentity: ${workloadIdentity.error?.message}`
			}
		}
		return {
			props: {
				// location: locationData.result,
				name,
				workloadIdentity: workloadIdentity.result
			}
		}
	}
</script>

<script>
	import { page } from '$app/stores'
	import format from '$lib/format'
	import { onMount } from 'svelte'
	import ClipboardJS from 'clipboard'
	import { goto } from '$app/navigation'
	import modal from '$lib/modal'

	// export let location
	export let workloadIdentity

	$: project = $page.stuff.project

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
	<ul class="moon-breadcrumb">
		<li>
			<a href={`/workload-identity?project=${project}`} class="moon-link"><h6>Workload Identities</h6></a>
		</li>
		<li>
			<h6>{workloadIdentity.name}</h6>
		</li>
	</ul>
</div>
<br>
<div class="moon-panel _dp-g _gg-24px">
	<div class="lo-12 _jtfit-st _gg-12px">
		<h3><strong>Workload Identity: {workloadIdentity.name}</strong></h3>
	</div>
	<hr>
	<div class="_dp-g _gg-16px _w-100pct _mxw-512px">
		<div class="moon-field">
			<label for="input-gsa">GSA</label>
			<div class="moon-input">
				<input id="input-gsa" value={workloadIdentity.gsa} readonly disabled>
			</div>
		</div>
		<div class="moon-field">
			<label for="input-location">Location</label>
			<div class="moon-input">
				<input id="input-location" value={workloadIdentity.location} readonly disabled>
			</div>
		</div>
		<div class="moon-field">
			<label for="div-created_at">Created at</label>
			<div id="div-created_at" class="moon-input">
				{format.datetime(workloadIdentity.createdAt)}
			</div>
		</div>
		<div class="moon-field">
			<label for="div-created_by">Created by</label>
			<div id="div-created_by" class="moon-input">
				{workloadIdentity.createdBy}
			</div>
		</div>
	</div>

	<hr>

	<div class="moon-field">
		<label for="pre-command">Command</label>
		<pre id="pre-command">
			<button class="copy" data-clipboard-action="copy" data-clipboard-target="#command">copy</button>
			<code id="command">{format.gsaBinding(workloadIdentity.projectId, workloadIdentity.name, workloadIdentity.gsa, 'acoshift-1362')}</code>
		</pre>
	</div>

	<div class="_mgl-at-lg">
		<button class="moon-button -danger" on:click={deleteItem}>Delete</button>
	</div>
</div>
