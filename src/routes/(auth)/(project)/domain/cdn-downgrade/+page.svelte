<script>
	import { onMount } from 'svelte'
	import ClipboardJS from 'clipboard'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal/index.js'
	import api from '$lib/api/index.js'

	const { data } = $props()

	const project = $derived(data.project)
	const domain = $derived(data.domain)
	const location = $derived(data.location)

	onMount(() => {
		const copyList = new ClipboardJS('.copy')
		return () => {
			copyList.destroy()
		}
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

<div class="nm-breadcrumb">
	<div class="nm-breadcrumb-item">
		<a href={`/domain?project=${project}`} class="nm-link"><h6>Domains</h6></a>
	</div>
	<div class="nm-breadcrumb-item">
		<a href="/domain/detail?project={project}&domain={domain.domain}" class="nm-link"><h6>{domain.domain}</h6></a>
	</div>
	<div class="nm-breadcrumb-item">
		<h6>CDN Downgrade</h6>
	</div>
</div>

<br>
<div class="nm-panel is-level-300 _dp-g _g-7">
	<div class="lo-12 _g-5">
		<h3>
			<strong>CDN Downgrade</strong>
		</h3>
	</div>

	<hr>

	<div class="content _dp-g _g-6 _w-100pct">
		<div class="nm-field">
			<label for="input-gsa">Domain</label>
			<div class="nm-input">
				<input id="input-gsa" value={domain.domain} readonly disabled>
			</div>
		</div>
		<div class="nm-field">
			<label for="input-location">Location</label>
			<div class="nm-input">
				<input id="input-location" value={domain.location} readonly disabled>
			</div>
		</div>
		<div class="nm-field">
			<div class="nm-checkbox">
				<input id="input-wildcard" type="checkbox" bind:checked={domain.wildcard} disabled readonly>
				<label for="input-wildcard">Wildcard</label>
			</div>
		</div>

		<hr>
		{#if location.endpoint}
			<div class="nm-field">
				<label for="input-ip">A Record</label>
				{#each [location.endpoint] as ip}
					<div class="nm-input -has-icon-right _mgbt-3">
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
		<!--	<div class="nm-field">-->
		<!--		<label for="input-ipv6">AAAA Record</label>-->
		<!--		{#each domain.dnsConfig.ipv6 as ip}-->
		<!--			<div class="nm-input -has-icon-right _mgbt-3">-->
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
			<div class="nm-field">
				<label for="input-cname">CNAME Record</label>
				{#each [location.cname] as cname}
					<div class="nm-input -has-icon-right">
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
	<div class="_dp-f _g-6">
		<div class="_dp-f _alit-ct _fw-w">
			<button class="nm-button" onclick={downgradeCdn}>Downgrade</button>
		</div>
	</div>
</div>
