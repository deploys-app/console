<script>
	import { onMount } from 'svelte'
	import { setupCopy } from '$lib/clipboard'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()

	const project = $derived(data.project)
	const domain = $derived(data.domain)
	const location = $derived(data.location)

	onMount(() => {
		return setupCopy('.copy')
	})

	function downgradeCdn () {
		modal.confirm({
			html: `Remove CDN from "${domain.domain}" ?`,
			yes: 'Downgrade',
			callback: async () => {
				const resp = await api.invoke('domain.create', {
					project,
					location: domain.location,
					domain: domain.domain,
					wildcard: domain.wildcard,
					cdn: false
				}, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				await goto(`/domain/detail?project=${project}&domain=${domain.domain}`)
			}
		})
	}
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/domain?project=${project}`} class="link"><h6>Domains</h6></a>
	</div>
	<div class="breadcrumb-item">
		<a href="/domain/detail?project={project}&domain={domain.domain}" class="link"><h6>{domain.domain}</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6>CDN Downgrade</h6>
	</div>
</div>

<br>
<div class="panel is-level-300 grid gap-6">
	<div class="grid grid-cols-1 gap-3">
		<h3>
			<strong>CDN Downgrade</strong>
		</h3>
	</div>

	<hr>

	<div class="content grid gap-4 w-full">
		<div class="field">
			<label for="input-gsa">Domain</label>
			<div class="input">
				<input id="input-gsa" value={domain.domain} readonly disabled>
			</div>
		</div>
		<div class="field">
			<label for="input-location">Location</label>
			<div class="input">
				<input id="input-location" value={domain.location} readonly disabled>
			</div>
		</div>
		<div class="field">
			<div class="checkbox">
				<input id="input-wildcard" type="checkbox" bind:checked={domain.wildcard} disabled readonly>
				<label for="input-wildcard">Wildcard</label>
			</div>
		</div>

		<hr>
		{#if location.endpoint}
			<div class="field">
				<label for="input-ip">A Record</label>
				{#each [location.endpoint] as ip, i (i)}
					<div class="input -has-icon-right mb-1">
						<input id="input-ip" value={ip} readonly disabled>
						<span class="icon -is-right copy"
							data-clipboard-text={ip}>
							<i class="fa-light fa-copy"></i>
						</span>
					</div>
				{/each}
			</div>
		{/if}
		<!--{#if (domain.dnsConfig.ipv6 ?? []).length > 0}-->
		<!--	<div class="field">-->
		<!--		<label for="input-ipv6">AAAA Record</label>-->
		<!--		{#each domain.dnsConfig.ipv6 as ip}-->
		<!--			<div class="input -has-icon-right mb-1">-->
		<!--				<input id="input-ipv6" value={ip} readonly disabled>-->
		<!--				<span class="icon -is-right copy"-->
		<!--					data-clipboard-text={ip}>-->
		<!--					<i class="fa-light fa-copy"></i>-->
		<!--				</span>-->
		<!--			</div>-->
		<!--		{/each}-->
		<!--	</div>-->
		<!--{/if}-->
		{#if location.cname}
			<div class="field">
				<label for="input-cname">CNAME Record</label>
				{#each [location.cname] as cname, i (i)}
					<div class="input -has-icon-right">
						<input id="input-cname" value={cname} readonly disabled>
						<span class="icon -is-right copy"
							data-clipboard-text={cname}>
							<i class="fa-light fa-copy"></i>
						</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<hr>
	<div class="flex gap-4">
		<div class="flex items-center flex-wrap">
			<button class="button" onclick={downgradeCdn}>Downgrade</button>
		</div>
	</div>
</div>
