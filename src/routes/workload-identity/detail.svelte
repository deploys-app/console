<script context="module">
	import api from '$lib/api'

	export async function load ({ url, stuff, fetch }) {
		const { project } = stuff
		const location = url.searchParams.get('location')
		const name = url.searchParams.get('name')

		const [locationData, workloadIdentity] = await Promise.all([
			api.invoke('location.get', { project, id: location }, fetch),
			api.invoke('workloadidentity.get', { project, location, name }, fetch)
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
				location: locationData.result,
				name,
				workloadIdentity: workloadIdentity.result
			}
		}
	}
</script>

<script>
	import { page } from '$app/stores'
	import format from '$lib/format'
	import { onDestroy, onMount } from 'svelte'
	import ClipboardJS from 'clipboard'
	import { goto } from '$app/navigation'

	export let location
	export let workloadIdentity

	$: project = $page.stuff.project

	let copyButton
	let copyCodeClipboard

	onMount(() => {
		copyCodeClipboard = new ClipboardJS(copyButton)
	})

	onDestroy(() => {
		copyCodeClipboard?.destroy()
	})

	function deleteItem () {
		window.dispatchEvent(new CustomEvent('confirm', {
			detail: {
				title: `Delete "${workloadIdentity.name}" ?`,
				yes: 'Delete',
				callback: async () => {
					const result = await api.invoke('workloadidentity.delete', {
						project,
						location: workloadIdentity.location,
						name: workloadIdentity.name
					}, fetch)
					if (!result.ok) {
						window.dispatchEvent(new CustomEvent('error', {
							detail: {
								error: result.error
							}
						}))
						return
					}
					await goto(`/workload-identity?project=${project}`)
				}
			}
		}))
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
				<input type="text" id="input-gsa" value={workloadIdentity.gsa} readonly disabled>
			</div>
		</div>
		<div class="moon-field">
			<label for="input-location">Location</label>
			<div class="moon-input">
				<input type="text" id="input-location" value={workloadIdentity.location} readonly disabled>
			</div>
		</div>
		<div class="moon-field">
			<label>Created at</label>
			<div class="moon-input">
				{format.datetime(workloadIdentity.createdAt)}
			</div>
		</div>
		<div class="moon-field">
			<label>Created by</label>
			<div class="moon-input">
				{workloadIdentity.createdBy}
			</div>
		</div>
	</div>

	<hr>

	<div class="moon-field">
		<label>Command</label>
		<pre>
			<button bind:this={copyButton} class="copy" data-clipboard-action="copy" data-clipboard-target="#command">copy</button>
			<code id="command">{format.gsaBinding(workloadIdentity.projectId, workloadIdentity.name, workloadIdentity.gsa, 'acoshift-1362')}</code>
		</pre>
	</div>

	<div class="_mgl-at-lg">
		<button class="moon-button -danger" on:click={deleteItem}>Delete</button>
	</div>
</div>
