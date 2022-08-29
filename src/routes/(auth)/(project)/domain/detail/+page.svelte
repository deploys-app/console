<script>
	import format from '$lib/format'
	import { onMount } from 'svelte'
	import ClipboardJS from 'clipboard'
	import { goto } from '$app/navigation'
	import modal from '$lib/modal'
	import api from '$lib/api'

	export let data
	$: ({
		project,
		domain
	} = data)

	onMount(() => {
		const copyList = new ClipboardJS('.copy')
		return () => {
			copyList.destroy()
		}
	})

	let reloadTimeout
	onMount(() => {
		handleReload()
		return () => {
			reloadTimeout && clearTimeout(reloadTimeout)
		}
	})
	function handleReload () {
		if (!['pending', 'verify'].includes(domain.status)) {
			return
		}
		const f = async () => {
			reloadTimeout = null
			await api.invalidate('domain.get')
			if (domain.status === 'pending') {
				reloadTimeout = setTimeout(f, 3000)
			} else if (domain.status === 'verify') {
				reloadTimeout = setTimeout(f, 5000)
			}
		}
		setTimeout(f, 3000)
	}

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

	function upgradeHostname () {
		modal.confirm({
			html: `Upgrade "${domain.domain}" to Hostname ?<br><br>This action can not rollback.`,
			yes: 'Upgrade to Hostname',
			callback: async () => {
				const resp = await api.invoke('domain.create', {
					project,
					location: domain.location,
					domain: domain.domain,
					type: 'hostname'
				}, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				await api.invalidate('domain.get')
				handleReload()
			}
		})
	}

	function upgradeWildcard () {
		modal.confirm({
			html: `Upgrade "${domain.domain}" to Wildcard ?<br><br>This action can not rollback.`,
			yes: 'Upgrade to Wildcard',
			callback: async () => {
				const resp = await api.invoke('domain.create', {
					project,
					location: domain.location,
					domain: domain.domain,
					type: 'wildcard'
				}, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				await api.invalidate('domain.get')
				handleReload()
			}
		})
	}
</script>

<div>
	<ul class="breadcrumb">
		<li>
			<a href={`/domain?project=${project}`} class="link"><h6>Domains</h6></a>
		</li>
		<li>
			<h6>{domain.domain}</h6>
		</li>
	</ul>
</div>
<br>
<div class="panel _dp-g _gg-24px">
	<div class="lo-12 _gg-12px">
		<div class="_dp-g _gg-16px _gatf-r _gatf-cl-lg _jtfct-spbtw">
			<h3 class="_mgr-24px _mgbt-16px _mgbt-0px-lg">
				<strong>Domain: {domain.domain}</strong>
			</h3>
			<div class="_dp-f">
				<button class="button -small -negative -tertiary" type="button" on:click={deleteItem}>
					Delete
				</button>
			</div>
		</div>
	</div>

	<hr>

	<div class="_dp-g _gg-16px _w-100pct _mxw-512px">
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
			<label for="input-type">Type</label>
			<div class="input">
				<input id="input-type" value={format.domainType(domain.type)} readonly disabled>
			</div>
		</div>
		<div class="field">
			<label for="text-created_at">Created at</label>
			<div class="input">
				<span id="text-created_at">{format.datetime(domain.createdAt)}</span>
			</div>
		</div>
		<div class="field">
			<label for="text-creted_by">Created by</label>
			<div class="input">
				<span id="text-creted_by">{domain.createdBy}</span>
			</div>
		</div>

		{#if domain.status === 'pending'}
			<hr>
			<p><strong>Domain Verification</strong></p>
			<div class="_fs-800">
				<i class="fa-solid fa-spinner-third fa-spin"></i>
			</div>
		{/if}

		{#if domain.verification?.ownership?.type}
			<hr>
			<p><strong>Domain Verification</strong></p>
			{#if (domain.verification.ownership.errors || []).length > 0}
				{#each domain.verification.ownership.errors as e}
					<p class="_cl-negative-500">{e}</p>
				{/each}
			{/if}
			<div class="field">
				<label for="input-owner_name">TXT Name</label>
				<div class="input -has-icon-right _mgbt-4px">
					<input id="input-owner_name" value={domain.verification.ownership.name} readonly disabled>
					<span class="_cl-text-mute _cl-white-hover _cs-pt _ussl-n _mgl-12px _fs-600 icon -is-right copy"
						data-clipboard-text={domain.verification.ownership.name}>
						<i class="fa-light fa-copy"></i>
					</span>
				</div>
			</div>
			<div class="field">
				<label for="input-owner_value">TXT Value</label>
				<div class="input -has-icon-right _mgbt-4px">
					<input id="input-owner_value" value={domain.verification.ownership.value} readonly disabled>
					<span class="_cl-text-mute _cl-white-hover _cs-pt _ussl-n _mgl-12px _fs-600 icon -is-right copy"
						data-clipboard-text={domain.verification.ownership.value}>
						<i class="fa-light fa-copy"></i>
					</span>
				</div>
			</div>
		{/if}

		{#if (domain.verification?.ssl?.records || []).length > 0}
			<hr>
			<p><strong>SSL/TLS Verification</strong></p>
			{#each domain.verification.ssl.records as it, index}
				<div class="field">
					<label for={`input-ssl_name_${index}`}>TXT Name</label>
					<div class="input -has-icon-right _mgbt-4px">
						<input id={`input-ssl_name_${index}`} value={it.txtName} readonly disabled>
						<span class="_cl-text-mute _cl-white-hover _cs-pt _ussl-n _mgl-12px _fs-600 icon -is-right copy"
							data-clipboard-text={it.txtName}>
								<i class="fa-light fa-copy"></i>
							</span>
					</div>
				</div>
				<div class="field">
					<label for={`input-ssl_value_${index}`}>TXT Value</label>
					<div class="input -has-icon-right _mgbt-4px">
						<input id={`input-ssl_value_${index}`} value={it.txtValue} readonly disabled>
						<span class="_cl-text-mute _cl-white-hover _cs-pt _ussl-n _mgl-12px _fs-600 icon -is-right copy"
							data-clipboard-text={it.txtValue}>
								<i class="fa-light fa-copy"></i>
							</span>
					</div>
				</div>
			{/each}
		{/if}

		{#if domain.status === 'success' || domain.status === 'verify'}
			<hr>
			{#if (domain.dnsConfig.ipv4 || []).length > 0}
				<div class="field">
					<label for="input-ip">A Record</label>
					{#each domain.dnsConfig.ipv4 as ip}
						<div class="input -has-icon-right _mgbt-4px">
							<input id="input-ip" value={ip} readonly disabled>
							<span class="_cl-text-mute _cl-white-hover _cs-pt _ussl-n _mgl-12px _fs-600 icon -is-right copy"
								data-clipboard-text={ip}>
								<i class="fa-light fa-copy"></i>
							</span>
						</div>
					{/each}
				</div>
			{/if}
			{#if (domain.dnsConfig.ipv6 || []).length > 0}
				<div class="field">
					<label for="input-ipv6">AAAA Record</label>
					{#each domain.dnsConfig.ipv6 as ip}
						<div class="input -has-icon-right _mgbt-4px">
							<input id="input-ipv6" value={ip} readonly disabled>
							<span class="_cl-text-mute _cl-white-hover _cs-pt _ussl-n _mgl-12px _fs-600 icon -is-right copy"
								data-clipboard-text={ip}>
								<i class="fa-light fa-copy"></i>
							</span>
						</div>
					{/each}
				</div>
			{/if}
			{#if (domain.dnsConfig.cname || []).length > 0}
				<div class="field">
					<label for="input-cname">CNAME Record</label>
					{#each domain.dnsConfig.cname as cname}
						<div class="input -has-icon-right">
							<input id="input-cname" value={cname} readonly disabled>
							<span class="_cl-text-mute _cl-white-hover _cs-pt _ussl-n _mgl-12px _fs-600 icon -is-right copy"
								data-clipboard-text={cname}>
								<i class="fa-light fa-copy"></i>
							</span>
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</div>

	<div>
		<div class="_mgbt-12px">
			<strong>Danger Zone</strong>
		</div>
		<div class="_bgcl-neutral-800 _pd-24px _bdw-1px _bdcl-negative-900 _bdrd-8px">
			{#if domain.type !== 'cloudflare' && domain.status === 'success'}
				<div class="_dp-f _fdrt-r-md _fdrt-cl _gg-24px _alit-ct">
					<div class="_f-1 lo-12 _gg-4px">
						<div><strong>Purge cache everything</strong></div>
						<p class="_fs-300 _opct-80">Cached resources are immediately removed from the stored assets in your Content Delivery Network</p>
					</div>
					<button class="button -negative -small" class:-loading={purging} on:click={purgeCache}>
						Purge Cache Everything
					</button>
				</div>
			{/if}
			{#if domain.type !== 'cloudflare' && domain.status === 'success'}
				<hr class="_mgv-24px">
				<div class="_dp-f _fdrt-r-md _fdrt-cl _gg-24px _alit-ct">
					<div class="_f-1 lo-12 _gg-4px">
						<div><strong>Purge Cache Prefix</strong></div>
						<p class="_fs-300 _opct-80">Cached resources are immediately removed from the stored assets in your Content Delivery Network Cached resources are immediately removed from the stored assets in your Content Delivery Network</p>
					</div>
					<button class="button -negative -small" class:-loading={purging} on:click={purgeCache}>
						Purge Cache Prefix
					</button>
				</div>
			{/if}
		</div>
	</div>

	{#if domain.type === 'cloudflare'}
		<hr>
		<div class="_dp-f _alit-ct _fw-w">
			<button class="button -positive _mgr-12px" on:click={upgradeHostname}>Upgrade to Hostname</button>
			<button class="button -positive" on:click={upgradeWildcard}>Upgrade to Wildcard</button>
		</div>
	{/if}
</div>
