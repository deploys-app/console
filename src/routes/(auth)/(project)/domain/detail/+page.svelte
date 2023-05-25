<script>
	import * as format from '$lib/format'
	import { onMount } from 'svelte'
	import ClipboardJS from 'clipboard'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import Swal from 'sweetalert2'

	export let data

	$: project = data.project
	$: domain = data.domain

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

	async function purgeCachePrefix () {
		if (purging) {
			return
		}

		const result = await Swal.fire({
			title: `Purge cache on domain "${domain.domain}"`,
			text: 'Type path prefix',
			icon: 'warning',
			input: 'text',
			showCancelButton: true,
			buttonsStyling: false,
			confirmButtonText: 'Purge',
			customClass: {
				confirmButton: 'button _cl-white -danger _mgr-6',
				cancelButton: 'button -negative -tertiary',
				actions: '_mgt-7'
			}
		})
		if (!result.isConfirmed || !result.value) {
			return
		}

		purging = true
		try {
			const resp = await api.invoke('domain.purgeCache', {
				project,
				domain: domain.domain,
				prefix: result.value
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			modal.success({ content: `Purged cache on domain "${domain.domain}" path "${result.value}"` })
		} finally {
			purging = false
		}
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

	function upgradeCdn () {
		modal.confirm({
			html: `Add CDN to "${domain.domain}" ?<br><br>This action can not roll back.`,
			yes: 'Upgrade to Hostname',
			callback: async () => {
				const resp = await api.invoke('domain.create', {
					project,
					location: domain.location,
					domain: domain.domain,
					cdn: true
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

<div class="nm-breadcrumb">
	<div class="nm-breadcrumb-item">
		<a href={`/domain?project=${project}`} class="nm-link"><h6>Domains</h6></a>
	</div>
	<div class="nm-breadcrumb-item">
		<h6>{domain.domain}</h6>
	</div>
</div>

<br>
<div class="nm-panel is-level-300 _dp-g _g-7">
	<div class="lo-12 _g-5">
		<div class="_dp-g _g-6 _gatf-r _gatf-cl:lg _jtfct-spbtw">
			<h3 class="_mgr-7 _mgbt-6 _mgbt-0:lg">
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

	<div class="content _dp-g _g-6 _w-100pct">
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
		<div class="field _mgt-5">
			<div class="checkbox">
				<input id="input-cdn" type="checkbox" bind:checked={domain.cdn} disabled readonly>
				<label for="input-cdn">CDN (DDoS Protection)</label>
			</div>
		</div>
		<div class="field">
			<div class="checkbox">
				<input id="input-wildcard" type="checkbox" bind:checked={domain.wildcard} disabled readonly>
				<label for="input-wildcard">Wildcard</label>
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
			<div class="_fs-8">
				<i class="fa-solid fa-spinner-third fa-spin"></i>
			</div>
		{/if}

		{#if domain.verification?.ownership?.type}
			<hr>
			<p><strong>Domain Verification</strong></p>
			{#if (domain.verification.ownership.errors ?? []).length > 0}
				{#each domain.verification.ownership.errors as e}
					<p class="_cl-negative _cl-opacity-80">{e}</p>
				{/each}
			{/if}
			<div class="field">
				<label for="input-owner_name">TXT Name</label>
				<div class="input -has-icon-right _mgbt-3">
					<input id="input-owner_name" value={domain.verification.ownership.name} readonly disabled>
					<span class="_cl-text-mute _cl-white:hover _cs-pt _ussl-n _mgl-5 _fs-6 icon -is-right copy"
						data-clipboard-text={domain.verification.ownership.name}>
						<i class="fa-light fa-copy"></i>
					</span>
				</div>
			</div>
			<div class="field">
				<label for="input-owner_value">TXT Value</label>
				<div class="input -has-icon-right _mgbt-3">
					<input id="input-owner_value" value={domain.verification.ownership.value} readonly disabled>
					<span class="_cl-text-mute _cl-white:hover _cs-pt _ussl-n _mgl-5 _fs-6 icon -is-right copy"
						data-clipboard-text={domain.verification.ownership.value}>
						<i class="fa-light fa-copy"></i>
					</span>
				</div>
			</div>
		{/if}

		{#if (domain.verification?.ssl?.records ?? []).length > 0}
			<hr>
			<p><strong>SSL/TLS Verification</strong></p>
			{#each domain.verification.ssl.records as it, index}
				<div class="field">
					<label for={`input-ssl_name_${index}`}>TXT Name</label>
					<div class="input -has-icon-right _mgbt-3">
						<input id={`input-ssl_name_${index}`} value={it.txtName} readonly disabled>
						<span class="_cl-text-mute _cl-white:hover _cs-pt _ussl-n _mgl-5 _fs-6 icon -is-right copy"
							data-clipboard-text={it.txtName}>
								<i class="fa-light fa-copy"></i>
							</span>
					</div>
				</div>
				<div class="field">
					<label for={`input-ssl_value_${index}`}>TXT Value</label>
					<div class="input -has-icon-right _mgbt-3">
						<input id={`input-ssl_value_${index}`} value={it.txtValue} readonly disabled>
						<span class="_cl-text-mute _cl-white:hover _cs-pt _ussl-n _mgl-5 _fs-6 icon -is-right copy"
							data-clipboard-text={it.txtValue}>
								<i class="fa-light fa-copy"></i>
							</span>
					</div>
				</div>
			{/each}
		{/if}

		{#if domain.status === 'success' || domain.status === 'verify'}
			<hr>
			{#if (domain.dnsConfig.ipv4 ?? []).length > 0}
				<div class="field">
					<label for="input-ip">A Record</label>
					{#each domain.dnsConfig.ipv4 as ip}
						<div class="input -has-icon-right _mgbt-3">
							<input id="input-ip" value={ip} readonly disabled>
							<span class="_cl-text-mute _cl-white:hover _cs-pt _ussl-n _mgl-5 _fs-6 icon -is-right copy"
								data-clipboard-text={ip}>
								<i class="fa-light fa-copy"></i>
							</span>
						</div>
					{/each}
				</div>
			{/if}
			{#if (domain.dnsConfig.ipv6 ?? []).length > 0}
				<div class="field">
					<label for="input-ipv6">AAAA Record</label>
					{#each domain.dnsConfig.ipv6 as ip}
						<div class="input -has-icon-right _mgbt-3">
							<input id="input-ipv6" value={ip} readonly disabled>
							<span class="_cl-text-mute _cl-white:hover _cs-pt _ussl-n _mgl-5 _fs-6 icon -is-right copy"
								data-clipboard-text={ip}>
								<i class="fa-light fa-copy"></i>
							</span>
						</div>
					{/each}
				</div>
			{/if}
			{#if (domain.dnsConfig.cname ?? []).length > 0}
				<div class="field">
					<label for="input-cname">CNAME Record</label>
					{#each domain.dnsConfig.cname as cname}
						<div class="input -has-icon-right">
							<input id="input-cname" value={cname} readonly disabled>
							<span class="_cl-text-mute _cl-white:hover _cs-pt _ussl-n _mgl-5 _fs-6 icon -is-right copy"
								data-clipboard-text={cname}>
								<i class="fa-light fa-copy"></i>
							</span>
						</div>
					{/each}
				</div>
			{/if}
		{/if}

		{#if domain.cdn && domain.status === 'success'}
			<hr>
			<div>
				<div class="_mgbt-5">
					<strong>Purge Cache</strong>
				</div>
				<div class="_bgcl-base-100 _pd-7 _bdw-1 _bdcl-negative _bdcl-opacity-70 _bdrd-4">
					<div class="_dp-f _fdrt-r:md _fdrt-cl _g-7 _alit-ct:md">
						<div class="_f-1 lo-12 _g-3">
							<div><strong>Purge everything</strong></div>
							<p class="_fs-2 _opct-80">Remove all cached resources</p>
						</div>
						<button class="button -negative -small" class:-loading={purging} on:click={purgeCache}>
							Purge everything
						</button>
					</div>
					<hr class="_mgv-7">
					<div class="_dp-f _fdrt-r:md _fdrt-cl _g-7 _alit-ct:md">
						<div class="_f-1 lo-12 _g-3">
							<div><strong>Purge prefix</strong></div>
							<p class="_fs-2 _opct-80">Remove cached resources at prefix path</p>
						</div>
						<button class="button -negative -small" class:-loading={purging} on:click={purgeCachePrefix}>
							Purge prefix
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>

	{#if !domain.cdn}
		<hr>
		<div class="_dp-f _alit-ct _fw-w">
			<button class="button -positive _mgr-5" on:click={upgradeCdn}>Add CDN (DDoS Protection)</button>
		</div>
	{/if}
</div>
