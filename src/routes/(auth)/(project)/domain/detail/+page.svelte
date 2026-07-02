<script lang="ts">
	import * as format from '$lib/format'
	import { onMount } from 'svelte'
	import { setupCopy } from '$lib/clipboard'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import DangerZone from '$lib/components/DangerZone.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import { getPermissionContext } from '$lib/permission'
	import { registerPageActions, type PageAction } from '$lib/pageactions/store.svelte'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const domain = $derived(data.domain)
	const dnsErrors = $derived(domain.verification?.dns?.errors ?? [])
	const hasDnsErrors = $derived(dnsErrors.length > 0)
	const headerStatus = $derived(domain.status)

	// ─── DNS record groups ───
	// The CNAME target is geolocation-routed to the nearest CDN edge, so a
	// subdomain should use it. The A/AAAA addresses are a fixed regional gateway
	// (not the geo-routed edge), kept as the apex fallback: a root/apex domain
	// can't carry a CNAME at the zone apex, so it needs an ALIAS/ANAME to the same
	// target or these A/AAAA records. We surface both groups and let the note guide
	// which to use (rather than only the CNAME, which silently broke apex domains).
	const cnameRecords = $derived((domain.dnsConfig?.cname ?? []).map((value) => ({ type: 'CNAME', value })))
	const ipRecords = $derived([
		...(domain.dnsConfig?.ipv4 ?? []).map((value) => ({ type: 'A', value })),
		...(domain.dnsConfig?.ipv6 ?? []).map((value) => ({ type: 'AAAA', value }))
	])
	const hasCname = $derived(cnameRecords.length > 0)
	const hasIpRecords = $derived(ipRecords.length > 0)
	const showConnect = $derived(
		(domain.status === 'success' || domain.status === 'verify' || !domain.wildcard) &&
		(hasCname || hasIpRecords)
	)
	const ownership = $derived(domain.verification?.ownership)
	const hasOwnership = $derived(!!ownership?.type)
	const ownershipErrors = $derived(ownership?.errors ?? [])
	const ssl = $derived(domain.verification?.ssl)
	const sslRecords = $derived(ssl?.records ?? [])
	const hasSsl = $derived(sslRecords.length > 0 || !!ssl?.dcv?.name)
	const hasAnyRecord = $derived(showConnect || hasOwnership || hasSsl)

	// ─── Certificate status ───
	// A cert normally issues in a minute or two; if it sits in pendingCreate for
	// over an hour something is wrong (Let's Encrypt rate-limit, a CAA record, or
	// a missing DCV CNAME) and it's heading toward the 24h reclaim — surface it.
	const certPendingLong = $derived(
		domain.certStatus === 'pendingCreate' &&
		!!domain.certPendingSince &&
		Date.now() - new Date(domain.certPendingSince).getTime() > 60 * 60 * 1000
	)
	const cert = $derived.by(() => {
		switch (domain.certStatus) {
		case 'created': return { show: true, tone: 'positive', icon: 'fa-solid fa-lock', label: 'Active' }
		case 'pendingCreate': return { show: true, tone: certPendingLong ? 'warning' : 'info', icon: 'fa-solid fa-certificate', label: 'Issuing' }
		case 'pendingDelete': return { show: true, tone: 'muted', icon: 'fa-solid fa-lock-open', label: 'Removing' }
		default: return { show: false, tone: 'muted', icon: '', label: '' }
		}
	})

	// ─── Status banner ───
	const banner = $derived.by(() => {
		if (domain.status === 'error') return { tone: 'negative', icon: 'fa-solid fa-circle-exclamation', title: 'DNS verification failed' }
		if (domain.status !== 'success') return { tone: 'warning', icon: 'fa-solid fa-clock', title: domain.wildcard ? 'Waiting for ownership record' : 'Waiting for DNS' }
		if (hasDnsErrors) return { tone: 'warning', icon: 'fa-solid fa-triangle-exclamation', title: 'DNS needs attention' }
		if (certPendingLong) return { tone: 'warning', icon: 'fa-solid fa-certificate', title: 'Certificate is taking longer than expected' }
		return { tone: 'positive', icon: 'fa-solid fa-circle-check', title: 'Domain is active' }
	})
	const showDnsMeta = $derived(domain.verification?.dns?.verifiedAt || domain.verification?.dns?.lastCheckedAt)

	onMount(() => {
		return setupCopy('.copy')
	})

	let reloadTimeout: ReturnType<typeof setTimeout> | null = null
	onMount(() => {
		handleReload()
		return () => {
			reloadTimeout && clearTimeout(reloadTimeout)
		}
	})
	function handleReload () {
		if (domain.status === 'success' && !hasDnsErrors) {
			return
		}
		const f = async () => {
			reloadTimeout = null
			await api.invalidate('domain.get')
			// DNS verification runs on a cron at minute-scale, no point polling faster.
			if (domain.status !== 'success' || hasDnsErrors) {
				reloadTimeout = setTimeout(f, 30000)
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

		const prefix = await modal.prompt({
			title: `Purge cache on domain "${domain.domain}"`,
			text: 'Type path prefix',
			yes: 'Purge',
			variant: 'is-variant-negative'
		})
		if (!prefix) {
			return
		}

		purging = true
		try {
			const resp = await api.invoke('domain.purgeCache', {
				project,
				domain: domain.domain,
				prefix
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			modal.success({ content: `Purged cache on domain "${domain.domain}" path prefix "${prefix}"` })
		} finally {
			purging = false
		}
	}

	async function purgeCacheFile () {
		if (purging) {
			return
		}

		const file = await modal.prompt({
			title: `Purge cache on domain "${domain.domain}"`,
			text: 'Type path exact',
			yes: 'Purge',
			variant: 'is-variant-negative'
		})
		if (!file) {
			return
		}

		purging = true
		try {
			const resp = await api.invoke('domain.purgeCache', {
				project,
				domain: domain.domain,
				file
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			modal.success({ content: `Purged cache on domain "${domain.domain}" path exact "${file}"` })
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

	// The Cache section (and its purge buttons) only renders for an active domain;
	// mirror that state gate here, plus the purge permission and the wildcard gate
	// on "Purge everything". Never surface Delete.
	const { can } = getPermissionContext()
	$effect(() => {
		if (domain.status !== 'success' || !can('domain.purgecache')) return
		const actions: PageAction[] = []
		if (!domain.wildcard) {
			actions.push({ id: 'domain-detail:purge-all', label: 'Purge everything', icon: 'fa-broom', keywords: 'purge clear invalidate cache everything all', run: purgeCache })
		}
		actions.push({ id: 'domain-detail:purge-prefix', label: 'Purge prefix', icon: 'fa-broom', keywords: 'purge clear invalidate cache prefix path', run: purgeCachePrefix })
		actions.push({ id: 'domain-detail:purge-file', label: 'Purge file', icon: 'fa-broom', keywords: 'purge clear invalidate cache file path exact', run: purgeCacheFile })
		return registerPageActions(actions)
	})

</script>

<style>
	/* ─── shared shell vars (matches the deployment detail design language) ─── */
	.shell {
		--rail-fg: hsl(var(--hsl-content));
		--rail-fg-muted: hsl(var(--hsl-content) / 0.5);
		--rail-divider: hsl(var(--hsl-content) / 0.08);
		--surface-bg: hsl(var(--hsl-base-100));

		display: flex;
		flex-direction: column;
		background: var(--surface-bg);
		border: 1px solid var(--rail-divider);
		border-radius: 10px;
		overflow: hidden;
		font-family: var(--ffml-primary);
		margin-bottom: 1rem;
	}

	.rail {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.55rem 1rem;
		border-bottom: 1px solid var(--rail-divider);
		background: linear-gradient(180deg,
			hsl(var(--hsl-base-200)) 0%,
			hsl(var(--hsl-base-100)) 100%);
		box-shadow: inset 0 1px 0 hsl(var(--hsl-content) / 0.04);
		flex-wrap: wrap;
	}

	.rail__brand {
		margin: 0;
		font-weight: 600;
		color: var(--rail-fg);
		font-size: 0.9rem;
	}

	.rail__stats {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding-left: 0.65rem;
		border-left: 1px solid var(--rail-divider);
	}

	.stat {
		display: inline-flex;
		align-items: baseline;
		gap: 0.35rem;
		color: var(--rail-fg-muted);
		font-size: 0.8125rem;
	}

	.stat__value {
		color: var(--rail-fg);
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}

	/* Certificate-status tones for the overview rail value. */
	.stat__value.cert-positive { color: hsl(var(--hsl-positive)); }
	.stat__value.cert-warning { color: hsl(var(--hsl-warning)); }
	.stat__value.cert-info { color: hsl(var(--hsl-info)); }
	.stat__value.cert-muted { color: hsl(var(--hsl-content) / 0.55); }
	.stat__value i { font-size: 0.85em; margin-right: 0.15rem; }

	.stat__unit { color: var(--rail-fg-muted); }

	.body { padding: 0.75rem 0; }

	.section {
		padding: 0.5rem 1rem 0.85rem;
		border-top: 1px solid hsl(var(--hsl-content) / 0.05);
	}

	.section:first-child { border-top: none; }

	/* ─── status banner ─── */
	.banner {
		--tone: var(--hsl-content);
		display: flex;
		gap: 0.85rem;
		padding: 0.9rem 1rem;
		margin: 0.5rem 1rem 0.25rem;
		border: 1px solid hsl(var(--tone) / 0.3);
		border-left-width: 3px;
		border-radius: 8px;
		background: hsl(var(--tone) / 0.06);
	}
	.banner.is-positive { --tone: var(--hsl-positive); }
	.banner.is-warning { --tone: var(--hsl-warning); }
	.banner.is-negative { --tone: var(--hsl-negative); }
	.banner.is-info { --tone: var(--hsl-primary); }

	.banner__icon {
		font-size: 1.05rem;
		line-height: 1.5;
		color: hsl(var(--tone));
		flex-shrink: 0;
	}

	.banner__content { min-width: 0; display: flex; flex-direction: column; gap: 0.3rem; }

	.banner__title {
		font-weight: 600;
		font-size: 0.9rem;
		color: hsl(var(--tone));
	}

	.banner__body {
		font-size: 0.8125rem;
		line-height: 1.55;
		color: hsl(var(--hsl-content) / 0.8);
	}
	.banner__body :global(strong) { color: hsl(var(--hsl-content)); font-weight: 600; }

	.banner__meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 1.1rem;
		margin-top: 0.15rem;
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.55);
		font-variant-numeric: tabular-nums;
	}
	.banner__meta b { color: hsl(var(--hsl-content) / 0.8); font-weight: 600; }

	.banner__err {
		font-family: var(--ffml-mono);
		font-size: 0.75rem;
		line-height: 1.5;
		color: hsl(var(--hsl-negative));
		overflow-wrap: anywhere;
	}

	/* ─── spec grid (overview) ─── */
	.spec-grid {
		display: grid;
		grid-template-columns: 1fr;
		row-gap: 0.35rem;
	}

	@media (min-width: 1024px) {
		.spec-grid { grid-template-columns: 1fr 1fr; column-gap: 2rem; }
	}

	.spec {
		display: grid;
		grid-template-columns: 8rem 1fr auto;
		align-items: baseline;
		column-gap: 0.75rem;
		padding: 0.2rem 0;
		min-width: 0;
	}

	.spec__label {
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content) / 0.6);
	}

	.spec__value {
		font-size: 0.875rem;
		color: hsl(var(--hsl-content));
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.spec__value.is-mono {
		font-family: var(--ffml-mono);
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content) / 0.92);
	}

	.chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }

	.tag {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.12rem 0.5rem;
		border-radius: 5px;
		background: hsl(var(--hsl-content) / 0.06);
		color: hsl(var(--hsl-content) / 0.7);
	}
	.tag.is-on { background: hsl(var(--hsl-primary) / 0.12); color: hsl(var(--hsl-primary)); }
	.tag i { font-size: 0.7rem; }

	/* ─── DNS record groups ─── */
	.group { display: flex; flex-direction: column; gap: 0.6rem; }

	.group__head { display: flex; flex-direction: column; gap: 0.2rem; }

	.group__title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		font-size: 0.875rem;
		color: hsl(var(--hsl-content));
	}
	.group__title .step {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.3rem;
		height: 1.3rem;
		border-radius: 50%;
		background: hsl(var(--hsl-primary) / 0.12);
		color: hsl(var(--hsl-primary));
		font-size: 0.7rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.group__desc {
		font-size: 0.8125rem;
		line-height: 1.5;
		color: hsl(var(--hsl-content) / 0.65);
	}
	.group__desc :global(em) { font-style: italic; color: hsl(var(--hsl-content) / 0.8); }

	/* A record-set groups one record kind (CNAME vs A/AAAA) under a small caption
	   so apex vs subdomain guidance maps onto the records you actually add. */
	.rec-set { display: flex; flex-direction: column; gap: 0.4rem; }
	.rec-set + .rec-set { margin-top: 0.6rem; }

	.rec-set__label {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: hsl(var(--hsl-content) / 0.55);
	}

	.rec-set__hint {
		text-transform: none;
		letter-spacing: 0;
		font-weight: 600;
		font-size: 0.7rem;
		padding: 0.05rem 0.4rem;
		border-radius: 5px;
		background: hsl(var(--hsl-primary) / 0.12);
		color: hsl(var(--hsl-primary));
	}

	.rec-set__note {
		font-size: 0.8125rem;
		line-height: 1.5;
		color: hsl(var(--hsl-content) / 0.65);
	}
	.rec-set__note :global(code) { font-family: var(--ffml-mono); font-size: 0.95em; }

	.recs { display: flex; flex-direction: column; gap: 0.5rem; }

	.rec {
		display: flex;
		align-items: stretch;
		gap: 0;
		border: 1px solid hsl(var(--hsl-content) / 0.1);
		border-radius: 8px;
		overflow: hidden;
		background: hsl(var(--hsl-base-100));
	}

	.rec__type {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 4.25rem;
		font-family: var(--ffml-mono);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.03em;
		color: hsl(var(--hsl-primary));
		background: hsl(var(--hsl-primary) / 0.08);
		border-right: 1px solid hsl(var(--hsl-content) / 0.08);
	}

	.rec__body { flex: 1; min-width: 0; display: flex; flex-direction: column; }

	.rec__line {
		display: grid;
		grid-template-columns: 3.25rem 1fr auto;
		align-items: center;
		gap: 0.6rem;
		padding: 0.4rem 0.7rem;
		min-width: 0;
	}
	.rec__line + .rec__line { border-top: 1px solid hsl(var(--hsl-content) / 0.06); }

	.rec__k {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: hsl(var(--hsl-content) / 0.45);
		font-weight: 600;
	}

	.rec__v {
		font-family: var(--ffml-mono);
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content) / 0.92);
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.rec__copy {
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.4);
		cursor: pointer;
		padding: 0.2rem 0.35rem;
		border-radius: 4px;
		transition: color 0.15s ease, background 0.15s ease;
	}
	.rec__copy:hover { color: hsl(var(--hsl-content)); background: hsl(var(--hsl-content) / 0.06); }
	.rec__copy:global([data-copied]) { color: hsl(var(--hsl-positive)); }

	.group__err {
		font-family: var(--ffml-mono);
		font-size: 0.75rem;
		line-height: 1.5;
		color: hsl(var(--hsl-negative));
		overflow-wrap: anywhere;
	}

	/* ─── cache purge ─── */
	.purge-row {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: flex-start;
	}
	@media (min-width: 1024px) {
		.purge-row { flex-direction: row; gap: 1.5rem; align-items: center; }
	}
	.purge-row + .purge-row {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid hsl(var(--hsl-content) / 0.08);
	}
	.purge-row__text { flex: 1; display: grid; gap: 0.15rem; }
	.purge-row__text strong { font-size: 0.875rem; }
	.purge-row__text p { font-size: 0.8125rem; color: hsl(var(--hsl-content) / 0.65); }
</style>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/domain?project=${project}`} class="link"><h6>Domains</h6></a>
	</div>
	<div class="breadcrumb-item min-w-0">
		<h6 class="min-w-0 wrap-anywhere">{domain.domain}</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div class="min-w-0">
		<h4 class="flex flex-wrap items-center gap-y-2 min-w-0">
			<StatusIcon status={headerStatus} />
			<strong>Domain</strong>
		</h4>
		<p class="page-sub font-mono min-w-0 wrap-anywhere">{domain.domain}</p>
	</div>
</div>

<!-- ─── OVERVIEW ─── -->
<div class="shell">
	<header class="rail">
		<h6 class="rail__brand">Overview</h6>
		<div class="rail__stats">
			<span class="stat">
				<span class="stat__unit">Status</span>
				<span class="stat__value">{headerStatus}</span>
			</span>
			{#if cert.show}
				<span class="stat">
					<span class="stat__unit">Certificate</span>
					<span class="stat__value cert-{cert.tone}"><i class={cert.icon}></i> {cert.label}</span>
				</span>
			{/if}
		</div>
	</header>

	<div class="body">
		<!-- status banner -->
		<div class="banner is-{banner.tone}">
			<i class="banner__icon {banner.icon}"></i>
			<div class="banner__content">
				<div class="banner__title">{banner.title}</div>
				<div class="banner__body">
					{#if domain.status === 'error'}
						<p>
							DNS verification has been failing for over 48 hours, so the certificate
							has been torn down. Re-point DNS using the records below and we'll
							re-verify automatically.
						</p>
					{:else if domain.status !== 'success'}
						{#if domain.wildcard}
							<p>
								Wildcard DNS can't resolve to a single IP, so verify ownership by
								adding the <strong>ownership TXT</strong> record below. We re-check every
								few minutes and switch the domain to <strong>success</strong> once the
								record is visible.
							</p>
						{:else}
							<p>
								Point your DNS at the records below. We re-check every few minutes and
								switch the domain to <strong>success</strong> once it resolves to this
								location. If your DNS sits behind a CDN/proxy and the record
								can't resolve to us directly, add the <em>Proxied DNS</em> TXT record
								instead — that proves ownership but doesn't enable certificate issuance.
							</p>
						{/if}
					{:else if hasDnsErrors}
						<p>
							The domain is verified, but our latest DNS check reported problems.
							Review the errors below and confirm your records still match.
						</p>
					{:else if certPendingLong}
						<p>
							The domain is verified, but its TLS certificate hasn't finished
							issuing. This usually means a Let's Encrypt rate-limit, a
							<code>CAA</code> record blocking Let's Encrypt, or a missing
							<code>_acme-challenge</code> record — check the <strong>TLS
							certificate</strong> records below. If it can't issue within 24 hours
							we reclaim it and keep re-trying automatically.
						</p>
					{:else}
						<p>Your domain is verified and serving traffic.</p>
					{/if}
				</div>

				{#if showDnsMeta}
					<div class="banner__meta">
						<span>Last verified <b>{format.datetime(domain.verification?.dns?.verifiedAt) || '—'}</b></span>
						<span>Last checked <b>{format.datetime(domain.verification?.dns?.lastCheckedAt) || '—'}</b></span>
					</div>
				{/if}

				{#if hasDnsErrors}
					{#each dnsErrors as e, i (i)}
						<p class="banner__err">{e}</p>
					{/each}
				{/if}
			</div>
		</div>

		<section class="section">
			<div class="spec-grid">
				<div class="spec">
					<span class="spec__label">Domain</span>
					<span class="spec__value is-mono">{domain.domain}</span>
					<span class="rec__copy copy" data-clipboard-text={domain.domain} title="Copy domain">
						<i class="fa-light fa-copy"></i>
					</span>
				</div>
				<div class="spec">
					<span class="spec__label">Location</span>
					<span class="spec__value is-mono">{domain.location}</span>
					<span></span>
				</div>
				<div class="spec">
					<span class="spec__label">Type</span>
					<span class="spec__value">
						<span class="chips">
							{#if domain.wildcard}
								<span class="tag is-on"><i class="fa-solid fa-asterisk"></i> Wildcard</span>
							{:else}
								<span class="tag"><i class="fa-solid fa-globe"></i> Standard</span>
							{/if}
						</span>
					</span>
					<span></span>
				</div>
				<div class="spec">
					<span class="spec__label">Created</span>
					<span class="spec__value">
						<span class="is-mono">{format.datetime(domain.createdAt) || '—'}</span>
						{#if domain.createdBy}<span class="spec__label"> by {domain.createdBy}</span>{/if}
					</span>
					<span></span>
				</div>
			</div>
		</section>
	</div>
</div>

{#snippet dnsRecord(type: string, host: string, value: string)}
	<div class="rec">
		<span class="rec__type">{type}</span>
		<div class="rec__body">
			<div class="rec__line">
				<span class="rec__k">Host</span>
				<span class="rec__v">{host}</span>
				<span class="rec__copy copy" data-clipboard-text={host} title="Copy host">
					<i class="fa-light fa-copy"></i>
				</span>
			</div>
			<div class="rec__line">
				<span class="rec__k">Value</span>
				<span class="rec__v">{value}</span>
				<span class="rec__copy copy" data-clipboard-text={value} title="Copy value">
					<i class="fa-light fa-copy"></i>
				</span>
			</div>
		</div>
	</div>
{/snippet}

<!-- ─── DNS RECORDS ─── -->
{#if hasAnyRecord}
	<div class="shell">
		<header class="rail">
			<h6 class="rail__brand">DNS Records</h6>
			<div class="rail__stats">
				<span class="stat"><span class="stat__unit">Add these at your DNS provider</span></span>
			</div>
		</header>

		<div class="body">
			{#if showConnect}
				<section class="section">
					<div class="group">
						<div class="group__head">
							<div class="group__title"><span class="step">1</span> Point your domain</div>
							<p class="group__desc">
								Create a record so traffic for <strong>{domain.domain}</strong> reaches this location.
								{#if hasCname}
									Apex domains (e.g. <code>example.com</code>) can't use CNAME — use an
									ALIAS/ANAME record to the same target{#if hasIpRecords}, or the A/AAAA records below{/if}.
								{/if}
							</p>
						</div>

						{#if hasCname}
							<div class="rec-set">
								<p class="rec-set__label">Subdomain <span class="rec-set__hint">recommended</span></p>
								<div class="recs">
									{#each cnameRecords as rec, i (i)}
										{@render dnsRecord(rec.type, domain.domain, rec.value)}
									{/each}
								</div>
							</div>
						{/if}

						{#if hasIpRecords}
							<div class="rec-set">
								{#if hasCname}
									<p class="rec-set__label">Root / apex domain</p>
									<p class="rec-set__note">
										These A/AAAA addresses point to a fixed regional gateway, not the CDN edge —
										the edge IPs are assigned by geolocation DNS, so a CNAME or ALIAS/ANAME (not a
										fixed A/AAAA) keeps visitors on the nearest edge.
									</p>
								{/if}
								<div class="recs">
									{#each ipRecords as rec, i (i)}
										{@render dnsRecord(rec.type, domain.domain, rec.value)}
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</section>
			{/if}

			{#if hasOwnership}
				<section class="section">
					<div class="group">
						<div class="group__head">
							<div class="group__title">
								<span class="step">{showConnect ? '2' : '1'}</span>
								{#if domain.wildcard}
									Verify ownership
								{:else}
									Proxied DNS (alternative)
								{/if}
							</div>
							{#if !domain.wildcard}
								<p class="group__desc">
									If your DNS sits behind a CDN/proxy (e.g. Cloudflare) so the
									record can't resolve here directly, add this TXT record
									instead to prove ownership and we'll accept the proxied setup.
								</p>
							{:else}
								<p class="group__desc">Add this TXT record so we can confirm you control the domain.</p>
							{/if}
						</div>
						{#if ownershipErrors.length > 0}
							{#each ownershipErrors as e, i (i)}
								<p class="group__err">{e}</p>
							{/each}
						{/if}
						<div class="recs">
							{@render dnsRecord('TXT', ownership.name, ownership.value)}
						</div>
					</div>
				</section>
			{/if}

			{#if hasSsl}
				<section class="section">
					<div class="group">
						<div class="group__head">
							<div class="group__title">
								<span class="step">{(showConnect ? 1 : 0) + (hasOwnership ? 1 : 0) + 1}</span>
								TLS certificate
							</div>
							<p class="group__desc">These records let us issue and renew the HTTPS certificate for your domain.</p>
						</div>
						{#if (ssl?.errors ?? []).length > 0}
							{#each ssl.errors as e, i (i)}
								<p class="group__err">{e}</p>
							{/each}
						{/if}
						<div class="recs">
							{#if ssl?.dcv?.name}
								{@render dnsRecord('CNAME', ssl.dcv.name, ssl.dcv.value)}
							{:else}
								{#each sslRecords as it, i (i)}
									{@render dnsRecord('TXT', it.txtName, it.txtValue)}
								{/each}
							{/if}
						</div>
					</div>
				</section>
			{/if}
		</div>
	</div>
{/if}

<!-- ─── CACHE ─── -->
{#if domain.status === 'success'}
	<div class="shell">
		<header class="rail">
			<h6 class="rail__brand">Cache</h6>
			<div class="rail__stats">
				<span class="stat"><span class="stat__unit">Purge edge-cached content</span></span>
			</div>
		</header>
		<div class="body">
			<section class="section">
				<div class="purge-row">
					<div class="purge-row__text">
						<strong>Purge everything</strong>
						<p>Remove all cached resources</p>
					</div>
					<GuardedButton permission="domain.purgecache" class="button is-variant-secondary" loading={purging} onclick={purgeCache} disabled={domain.wildcard}>
						Purge everything
					</GuardedButton>
				</div>
				<div class="purge-row">
					<div class="purge-row__text">
						<strong>Purge prefix</strong>
						<p>Remove cached resources at a prefix path</p>
					</div>
					<GuardedButton permission="domain.purgecache" class="button is-variant-secondary" loading={purging} onclick={purgeCachePrefix}>
						Purge prefix
					</GuardedButton>
				</div>
				<div class="purge-row">
					<div class="purge-row__text">
						<strong>Purge file</strong>
						<p>Remove cached resources at an exact path</p>
					</div>
					<GuardedButton permission="domain.purgecache" class="button is-variant-secondary" loading={purging} onclick={purgeCacheFile}>
						Purge file
					</GuardedButton>
				</div>
			</section>
		</div>
	</div>
{/if}

<DangerZone description="Permanently delete this domain. Routing and TLS certificates will be removed.">
	<GuardedButton permission="domain.delete" class="button is-variant-negative" type="button" onclick={deleteItem}>
		Delete
	</GuardedButton>
</DangerZone>
