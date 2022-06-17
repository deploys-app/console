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

		return {
			props: {
				domain: domain.result
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

	export let domain

	$: project = $page.stuff.project

	onMount(() => {
		const copyList = new ClipboardJS('.copy')
		return () => {
			copyList.destroy()
		}
	})

	let purging = false
	async function purgeCache () {
		if (purging) {
			return
		}

		await modal.confirm({
			title: `Purge cache on domain "${domain.domain}" ?`,
			yes: 'Purge',
			callback: async () => {
				purging = true
				try {
					const resp = await api.invoke('domain.purgeCache', {
						project,
						domain: domain.domain
					}, fetch)
					if (!resp.ok) {
						modal.error({ error: resp.error })
						return
					}
					modal.success({ content: `Purged cache on domain "${domain.domain}"` })
				} finally {
					purging = false
				}
			}
		})
	}

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
	<div class="lo-12 _gg-12px">
		<div class="_dp-g _gg-16px _gatf-r _gatf-cl-lg _jtfct-spbtw">
			<h3 class="_mgr-24px _mgbt-16px _mgbt-0px-lg">
				<strong>Domain: {domain.domain}</strong>
			</h3>
			<div class="_dp-f">
				<button class="moon-button -small -negative -tertiary" type="button" on:click={deleteItem}>
					Delete
				</button>
			</div>
		</div>
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

		<hr>

		{#if (domain.dnsConfig.ipv4 || []).length > 0}
			<div class="moon-field">
				<label for="input-ip">A Record</label>
				{#each domain.dnsConfig.ipv4 as ip}
					<div class="moon-input -has-icon-right _mgbt-4px">
						<input type="text" id="input-ip" value={ip} readonly disabled>
						<span class="_cl-text-mute _cl-white-hover _cs-pt _ussl-n _mgl-12px _fs-600 icon -is-right copy"
							data-clipboard-text={ip}>
							<i class="fa-light fa-copy"></i>
						</span>
					</div>
				{/each}
			</div>
		{/if}
		{#if (domain.dnsConfig.ipv6 || []).length > 0}
			<div class="moon-field">
				<label for="input-ipv6">AAAA Record</label>
				{#each domain.dnsConfig.ipv6 as ip}
					<div class="moon-input -has-icon-right _mgbt-4px">
						<input type="text" id="input-ipv6" value={ip} readonly disabled>
						<span class="_cl-text-mute _cl-white-hover _cs-pt _ussl-n _mgl-12px _fs-600 icon -is-right copy"
							data-clipboard-text={ip}>
							<i class="fa-light fa-copy"></i>
						</span>
					</div>
				{/each}
			</div>
		{/if}
		{#if (domain.dnsConfig.cname || []).length > 0}
			<div class="moon-field">
				<label for="input-cname">CNAME Record</label>
				{#each domain.dnsConfig.cname as cname}
					<div class="moon-input -has-icon-right">
						<input type="text" id="input-cname" value={cname} readonly disabled>
						<span class="_cl-text-mute _cl-white-hover _cs-pt _ussl-n _mgl-12px _fs-600 icon -is-right copy"
							data-clipboard-text={cname}>
							<i class="fa-light fa-copy"></i>
						</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<hr>

	<div class="_dp-f _alit-ct _fw-w">
		<button class="moon-button -danger" class:-loading={purging} on:click={purgeCache}>Purge Cache</button>
	</div>
</div>
