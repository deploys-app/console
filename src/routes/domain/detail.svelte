<script context="module">
	import api from '$lib/api'

	export async function load ({ url, stuff, fetch }) {
		const { project } = stuff
		const domainName = url.searchParams.get('domain')

		const domain = await api.invoke('domain.get', { project, domain: domainName }, fetch)
		if (!domain.ok) {
			if (domain.error?.notFound) {
				return {
					status: 302,
					redirect: `/domain?project=${project}`
				}
			}
			return {
				status: 500,
				error: `domain: ${domain.error?.message}`
			}
		}

		const location = await api.invoke('location.get', { project, id: domain.result.location }, fetch)
		if (!location.ok) {
			return {
				status: 500,
				error: `location: ${location.error?.message}`
			}
		}

		return {
			props: {
				location: location.result,
				domain: domain.result
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
	import modal from '$lib/modal'

	export let location
	export let domain

	$: project = $page.stuff.project

	let copyList

	onMount(() => {
		copyList = new ClipboardJS('.copy')
	})

	onDestroy(() => {
		copyList?.destroy()
	})

	function deleteItem () {
		modal.confirm({
			title: `Delete domain "${domain.domain}" ?`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('domain.delete', {
					project,
					domain: domain.domain
				}, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				await goto(`/domain?project=${project}`)
			}
		})
	}
</script>

<div>
	<ul class="moon-breadcrumb">
		<li>
			<a href={`/domain?project=${project}`} class="moon-link"><h6>Domains</h6></a>
		</li>
		<li>
			<h6>{domain.domain}</h6>
		</li>
	</ul>
</div>
<br>
<div class="moon-panel _dp-g _gg-24px">
	<div class="lo-12 _jtfit-st _gg-12px">
		<h3><strong>Domain: {domain.domain}</strong></h3>
	</div>
	<hr>
	<div class="_dp-g _gg-16px _w-100pct _mxw-512px">
		<div class="moon-field">
			<label for="input-gsa">Domain</label>
			<div class="moon-input">
				<input type="text" id="input-gsa" value={domain.domain} readonly disabled>
			</div>
		</div>
		<div class="moon-field">
			<label for="input-location">Location</label>
			<div class="moon-input">
				<input type="text" id="input-location" value={domain.location} readonly disabled>
			</div>
		</div>
		<div class="moon-field">
			<label for="input-type">Type</label>
			<div class="moon-input">
				<input type="text" id="input-type" value={format.domainType(domain.type)} readonly disabled>
			</div>
		</div>
		{#if location.endpoint}
			<div class="moon-field">
				<label for="input-ip">A Record</label>
				<div class="moon-input -has-icon-right">
					<input type="text" id="input-ip" value={location.endpoint} readonly disabled>
					<span class="_cl-text-mute _cl-white-hover _cs-pt _ussl-n _mgl-12px _fs-600 icon -is-right copy"
						data-clipboard-text={location.endpoint}>
						<i class="fal fa-copy"></i>
					</span>
				</div>
			</div>
		{/if}
		{#if location.cname}
			<div class="moon-field">
				<label for="input-cname">CNAME Record</label>
				<div class="moon-input -has-icon-right">
					<input type="text" id="input-cname" value={location.cname} readonly disabled>
					<span class="_cl-text-mute _cl-white-hover _cs-pt _ussl-n _mgl-12px _fs-600 icon -is-right copy"
						data-clipboard-text={location.cname}>
						<i class="fal fa-copy"></i>
					</span>
				</div>
			</div>
		{/if}
		<div class="moon-field">
			<label for="text-created_at">Created at</label>
			<div class="moon-input">
				<span id="text-created_at">{format.datetime(domain.createdAt)}</span>
			</div>
		</div>
		<div class="moon-field">
			<label for="text-creted_by">Created by</label>
			<div class="moon-input">
				<span id="text-creted_by">{domain.createdBy}</span>
			</div>
		</div>
	</div>

	<hr>

	<div class="_mgl-at-lg">
		<button class="moon-button -danger" on:click={deleteItem}>Delete</button>
	</div>
</div>
