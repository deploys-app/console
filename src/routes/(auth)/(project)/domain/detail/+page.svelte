<script>
	import * as format from '$lib/format'
	import { onMount } from 'svelte'
	import { setupCopy } from '$lib/clipboard'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import Swal from 'sweetalert2'

	const { data } = $props()

	const project = $derived(data.project)
	const domain = $derived(data.domain)
	const dnsErrors = $derived(domain.verification?.dns?.errors ?? [])
	const hasDnsErrors = $derived(dnsErrors.length > 0)
	const headerStatus = $derived(domain.cdn && domain.verification?.ssl?.pending ? 'verify' : domain.status)

	onMount(() => {
		return setupCopy('.copy')
	})

	let reloadTimeout
	onMount(() => {
		handleReload()
		return () => {
			reloadTimeout && clearTimeout(reloadTimeout)
		}
	})
	function handleReload () {
		const nonCdnDnsNeedsAttention = !domain.cdn && (domain.status !== 'success' || hasDnsErrors)
		if (!['pending', 'verify'].includes(domain.status) && !nonCdnDnsNeedsAttention) {
			return
		}
		const f = async () => {
			reloadTimeout = null
			await api.invalidate('domain.get')
			// Non-CDN DNS verification runs on a cron at minute-scale, no point polling faster.
			if (!domain.cdn && (domain.status !== 'success' || hasDnsErrors)) {
				reloadTimeout = setTimeout(f, 30000)
			} else if (domain.status === 'pending') {
				reloadTimeout = setTimeout(f, 3000)
			} else if (domain.status === 'verify') {
				reloadTimeout = setTimeout(f, 5000)
			}
		}
		setTimeout(f, 3000)
	}

	let purging = $state(false)
	async function purgeCache () {
		if (domain.wildcard) {
			return // not supported
		}

		if (purging) {
			return
		}

		await modal.confirm({
			title: `Purge cache on domain "${domain.domain}"?`,
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
			background: 'var(--modal-panel-background)',
			color: 'var(--modal-panel-color)',
			confirmButtonText: 'Purge',
			customClass: {
				confirmButton: 'button is-variant-negative mr-4',
				cancelButton: 'button is-variant-tertiary',
				actions: 'mt-6'
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
			modal.success({ content: `Purged cache on domain "${domain.domain}" path prefix "${result.value}"` })
		} finally {
			purging = false
		}
	}

	async function purgeCacheFile () {
		if (purging) {
			return
		}

		const result = await Swal.fire({
			title: `Purge cache on domain "${domain.domain}"`,
			text: 'Type path exact',
			icon: 'warning',
			input: 'text',
			showCancelButton: true,
			buttonsStyling: false,
			background: 'var(--modal-panel-background)',
			color: 'var(--modal-panel-color)',
			confirmButtonText: 'Purge',
			customClass: {
				confirmButton: 'button is-variant-negative mr-4',
				cancelButton: 'button is-variant-tertiary',
				actions: 'mt-6'
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
				file: result.value
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			modal.success({ content: `Purged cache on domain "${domain.domain}" path exact "${result.value}"` })
		} finally {
			purging = false
		}
	}

	function deleteItem () {
		modal.confirm({
			title: `Delete domain "${domain.domain}"?`,
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
			html: `Add CDN to "${domain.domain}"?`,
			yes: 'Upgrade',
			callback: async () => {
				const resp = await api.invoke('domain.create', {
					project,
					location: domain.location,
					domain: domain.domain,
					wildcard: domain.wildcard,
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

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/domain?project=${project}`} class="link"><h6>Domains</h6></a>
	</div>
	<div class="breadcrumb-item min-w-0">
		<h6 class="min-w-0 break-all">{domain.domain}</h6>
	</div>
</div>

<br>
<div class="panel is-level-300 grid gap-6">
	<div class="grid grid-cols-1 gap-3">
		<h3 class="flex flex-wrap items-center gap-y-2 min-w-0">
			<StatusIcon status={headerStatus} />
			<strong class="min-w-0 break-all">Domain: {domain.domain}</strong>
			{#if hasDnsErrors}
				<i class="fa-solid fa-triangle-exclamation text-warning ml-3"
					title="DNS verification is failing. See details below."></i>
			{/if}
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
		<div class="field mt-3">
			<div class="checkbox">
				<input id="input-cdn" type="checkbox" bind:checked={domain.cdn} disabled readonly>
				<label for="input-cdn">CDN</label>
			</div>
		</div>
		<div class="field">
			<div class="checkbox">
				<input id="input-wildcard" type="checkbox" bind:checked={domain.wildcard} disabled readonly>
				<label for="input-wildcard">Wildcard</label>
			</div>
		</div>
		<div class="field">
			<label for="input-created_at">Created at</label>
			<div class="input">
				<input id="input-created_at" value={format.datetime(domain.createdAt)} readonly disabled>
			</div>
		</div>
		<div class="field">
			<label for="input-created_by">Created by</label>
			<div class="input">
				<input id="input-created_by" value={domain.createdBy} readonly disabled>
			</div>
		</div>

		{#if domain.cdn && domain.status === 'pending'}
			<hr>
			<p><strong>Domain Verification</strong></p>
			<div class="text-2xl">
				<i class="fa-solid fa-spinner-third fa-spin"></i>
			</div>
		{/if}

		{#if !domain.cdn && (domain.status !== 'success' || hasDnsErrors)}
			<hr>
			<p><strong>DNS Verification</strong></p>
			{#if domain.status !== 'success'}
				<p class="text-sm opacity-80">
					{#if domain.wildcard}
						Wildcard DNS can't resolve to a single IP, so verify ownership by
						adding the TXT record below. We re-check every few minutes and
						switch the domain to <strong>success</strong> once the record is
						visible.
					{:else}
						Point your DNS at the records below. We re-check every few minutes
						and switch the domain to <strong>success</strong> once it resolves
						to this location. If your DNS is behind a CDN/proxy and the A/AAAA
						records can't resolve to us directly, add the TXT record under
						<em>Proxied DNS (alternative)</em>. That proves ownership but
						doesn't enable certificate issuance — point DNS directly if you
						need us to issue a TLS certificate.
					{/if}
				</p>

				{#if domain.status === 'error'}
					<p class="text-negative text-content/80">
						DNS verification has been failing for over 48 hours. The certificate
						has been torn down. Re-point DNS and we'll re-verify automatically.
					</p>
				{/if}
			{:else if domain.wildcard}
				<p class="text-content/80">
					Ownership is confirmed. The wildcard certificate can't be issued
					until you also add the SSL/TLS CNAME record above. We re-check
					every few minutes and issue the certificate automatically once
					the CNAME resolves.
				</p>
			{:else}
				<p class="text-content/80">
					We can't issue or renew a TLS certificate with your current DNS
					setup. Re-check your DNS configuration against the records below.
				</p>
			{/if}

			<p class="text-sm opacity-80">
				Last verified: {format.datetime(domain.verification?.dns?.verifiedAt) || '-'}
			</p>
			<p class="text-sm opacity-80">
				Last checked: {format.datetime(domain.verification?.dns?.lastCheckedAt) || '-'}
			</p>
			{#if hasDnsErrors}
				{#each dnsErrors as e, i (i)}
					<p class="text-negative text-content/80">{e}</p>
				{/each}
			{/if}
		{/if}

		{#snippet ownershipBlock()}
			{#if domain.verification?.ownership?.type}
				<hr>
				<p>
					<strong>
						{#if domain.cdn}
							Domain Verification
						{:else if domain.wildcard}
							Ownership TXT Record
						{:else}
							Proxied DNS (alternative)
						{/if}
					</strong>
				</p>
				{#if !domain.cdn && !domain.wildcard}
					<p class="text-sm opacity-80">
						If your DNS sits behind a CDN/proxy (e.g. Cloudflare) so the A/AAAA
						records can't resolve to this location directly, add this TXT record
						to prove ownership and we'll accept the proxied setup.
					</p>
				{/if}
				{#if (domain.verification.ownership.errors ?? []).length > 0}
					{#each domain.verification.ownership.errors as e, i (i)}
						<p class="text-negative text-content/80">{e}</p>
					{/each}
				{/if}
				<div class="field">
					<label for="input-owner_name">TXT Name</label>
					<div class="input -has-icon-right mb-1">
						<input id="input-owner_name" value={domain.verification.ownership.name} readonly disabled>
						<span class="icon -is-right copy"
							data-clipboard-text={domain.verification.ownership.name}>
							<i class="fa-light fa-copy"></i>
						</span>
					</div>
				</div>
				<div class="field">
					<label for="input-owner_value">TXT Value</label>
					<div class="input -has-icon-right mb-1">
						<input id="input-owner_value" value={domain.verification.ownership.value} readonly disabled>
						<span class="icon -is-right copy"
							data-clipboard-text={domain.verification.ownership.value}>
							<i class="fa-light fa-copy"></i>
						</span>
					</div>
				</div>
			{/if}
		{/snippet}

		{#if domain.cdn || domain.wildcard}
			{@render ownershipBlock()}
		{/if}

		{#if (domain.verification?.ssl?.records ?? []).length > 0 || domain.verification?.ssl?.dcv?.name}
			<hr>
			<p><strong>SSL/TLS Verification</strong></p>

			{#if domain.verification.ssl.dcv.name}
				<div class="field">
					<label for="input-ssl_dcv_name">CNAME Name</label>
					<div class="input -has-icon-right mb-1">
						<input id="input-ssl_dcv_name" value={domain.verification.ssl.dcv.name} readonly disabled>
						<span class="icon -is-right copy"
							data-clipboard-text={domain.verification.ssl.dcv.name}>
								<i class="fa-light fa-copy"></i>
							</span>
					</div>
				</div>
				<div class="field">
					<label for="input-ssl_dcv_value">CNAME Value</label>
					<div class="input -has-icon-right mb-1">
						<input id="input-ssl_dcv_value" value={domain.verification.ssl.dcv.value} readonly disabled>
						<span class="icon -is-right copy"
							data-clipboard-text={domain.verification.ssl.dcv.value}>
								<i class="fa-light fa-copy"></i>
							</span>
					</div>
				</div>
			{:else}
				{#each domain.verification.ssl.records as it, index (index)}
					<div class="field">
						<label for={`input-ssl_name_${index}`}>TXT Name</label>
						<div class="input -has-icon-right mb-1">
							<input id={`input-ssl_name_${index}`} value={it.txtName} readonly disabled>
							<span class="icon -is-right copy"
								data-clipboard-text={it.txtName}>
									<i class="fa-light fa-copy"></i>
								</span>
						</div>
					</div>
					<div class="field">
						<label for={`input-ssl_value_${index}`}>TXT Value</label>
						<div class="input -has-icon-right mb-1">
							<input id={`input-ssl_value_${index}`} value={it.txtValue} readonly disabled>
							<span class="icon -is-right copy"
								data-clipboard-text={it.txtValue}>
									<i class="fa-light fa-copy"></i>
								</span>
						</div>
					</div>
				{/each}
			{/if}
		{/if}

		{#if domain.status === 'success' || domain.status === 'verify' || (!domain.cdn && !domain.wildcard)}
			<hr>
			{#if (domain.dnsConfig.ipv4 ?? []).length > 0}
				<div class="field">
					<label for="input-ip">A Record</label>
					{#each domain.dnsConfig.ipv4 as ip, i (i)}
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
			{#if (domain.dnsConfig.ipv6 ?? []).length > 0}
				<div class="field">
					<label for="input-ipv6">AAAA Record</label>
					{#each domain.dnsConfig.ipv6 as ip, i (i)}
						<div class="input -has-icon-right mb-1">
							<input id="input-ipv6" value={ip} readonly disabled>
							<span class="icon -is-right copy"
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
					{#each domain.dnsConfig.cname as cname, i (i)}
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
		{/if}

		{#if !domain.cdn && !domain.wildcard}
			{@render ownershipBlock()}
		{/if}

		{#if domain.cdn && domain.status === 'success'}
			<hr>
			<div>
				<div class="mb-3">
					<strong>Purge Cache</strong>
				</div>
				<div class="bg-base-100 p-4 sm:p-6 border border-negative/70 rounded-md">
					<div class="flex lg:flex-row flex-col gap-4 lg:gap-6 lg:items-center">
						<div class="flex-1 grid grid-cols-1 gap-1">
							<div><strong>Purge everything</strong></div>
							<p class="text-sm opacity-80">Remove all cached resources</p>
						</div>
						<button class="button" class:is-loading={purging} onclick={purgeCache} disabled={domain.wildcard}>
							Purge everything
						</button>
					</div>
					<hr class="my-4 sm:my-6">
					<div class="flex lg:flex-row flex-col gap-4 lg:gap-6 lg:items-center">
						<div class="flex-1 grid grid-cols-1 gap-1">
							<div><strong>Purge prefix</strong></div>
							<p class="text-sm opacity-80">Remove cached resources at prefix path</p>
						</div>
						<button class="button" class:is-loading={purging} onclick={purgeCachePrefix}>
							Purge prefix
						</button>
					</div>
					<hr class="my-4 sm:my-6">
					<div class="flex lg:flex-row flex-col gap-4 lg:gap-6 lg:items-center">
						<div class="flex-1 grid grid-cols-1 gap-1">
							<div><strong>Purge file</strong></div>
							<p class="text-sm opacity-80">Remove cached resources at exact path</p>
						</div>
						<button class="button" class:is-loading={purging} onclick={purgeCacheFile}>
							Purge file
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<hr>
	{#if domain.cdn}
		<div class="flex items-center flex-wrap">
			<a class="button" href="/domain/cdn-downgrade?project={project}&domain={domain.domain}">Remove CDN</a>
		</div>
	{:else}
		<div class="flex items-center flex-wrap">
			<button class="button" onclick={upgradeCdn} disabled>Add CDN</button>
		</div>
	{/if}

	<hr>
	<div class="flex gap-4">
		<button class="button" type="button" onclick={deleteItem}>
			Delete
		</button>
	</div>
</div>
