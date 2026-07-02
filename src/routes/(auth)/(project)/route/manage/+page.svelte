<script lang="ts">
	import * as format from '$lib/format'
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'
	import { setupCopy } from '$lib/clipboard'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import DangerZone from '$lib/components/DangerZone.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import { routeTargetMeta } from '$lib/route'
	import { getPermissionContext } from '$lib/permission'
	import { registerPageActions, type PageAction } from '$lib/pageactions/store.svelte'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const route = $derived(data.route)

	const params = $derived(`project=${project}` +
		`&location=${encodeURIComponent(route.location)}` +
		`&domain=${encodeURIComponent(route.domain)}` +
		`&path=${encodeURIComponent(route.path)}`)

	const fullUrl = $derived(`https://${route.domain}${route.path}`)

	// Known target schemes (mirrors api.RouteTargetPrefix).
	const targetPrefixes = ['deployment://', 'redirect://', 'http://', 'ipfs://', 'ipns://', 'dnslink://']

	function splitTarget (target: string | undefined) {
		for (const p of targetPrefixes) {
			if (target?.startsWith(p)) return { prefix: p, value: target.slice(p.length) }
		}
		return { prefix: 'deployment://', value: target ?? '' }
	}

	const parsed = $derived(splitTarget(route.target))
	const typeLabel = $derived(routeTargetMeta[parsed.prefix]?.label ?? parsed.prefix)
	const targetIcon = $derived(routeTargetMeta[parsed.prefix]?.icon ?? 'fa-cube')

	// deployment:// targets resolve to a deployment in the same location; link
	// straight to its detail page so the route is navigable. Derive the name from
	// the parsed target (what's displayed) rather than route.deployment, which the
	// API doesn't reliably populate.
	const deploymentUrl = $derived(
		parsed.prefix === 'deployment://' && parsed.value
			? `/deployment/detail?project=${project}` +
				`&location=${encodeURIComponent(route.location)}` +
				`&name=${encodeURIComponent(parsed.value)}`
			: ''
	)

	const authType = $derived(
		route.config?.basicAuth ? 'basic' : route.config?.forwardAuth ? 'forward' : 'none'
	)
	const authLabel = $derived({ basic: 'Basic Auth', forward: 'Forward Auth', none: 'Public' }[authType])
	const authIcon = $derived({ basic: 'fa-lock', forward: 'fa-shield-halved', none: 'fa-lock-open' }[authType])
	const basic = $derived(route.config?.basicAuth)
	const fwd = $derived(route.config?.forwardAuth)
	const hostOverride = $derived(route.config?.host)
	const reqHeaders = $derived(fwd?.authRequestHeaders ?? [])
	const resHeaders = $derived(fwd?.authResponseHeaders ?? [])

	onMount(() => setupCopy('.copy'))

	// Mirror the header's Visit + Edit controls (never Delete). Visit is ungated
	// like its link; Edit follows route.create.
	const { can } = getPermissionContext()
	$effect(() => {
		const actions: PageAction[] = [
			{ id: 'route-manage:visit', label: 'Visit', icon: 'fa-arrow-up-right-from-square', keywords: 'open visit browse url', run: () => window.open(fullUrl, '_blank', 'noopener,noreferrer') }
		]
		if (can('route.create')) {
			actions.push({ id: 'route-manage:edit', label: 'Edit', icon: 'fa-pencil', keywords: 'edit modify update route', href: `/route/edit?${params}` })
		}
		return registerPageActions(actions)
	})

	function deleteRoute () {
		modal.confirm({
			title: `Delete route ${route.domain}${route.path} in ${route.location}?`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('route.delete', {
					project,
					location: route.location,
					domain: route.domain,
					path: route.path
				}, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				await api.invalidate('route.list')
				goto(`/route?project=${project}`)
			}
		})
	}
</script>

<style>
	/* ─── shared shell vars (matches the deployment / domain detail design) ─── */
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
		font-weight: 600;
	}

	.stat__unit { color: var(--rail-fg-muted); }

	.body { padding: 0.75rem 0; }

	.section {
		padding: 0.5rem 1rem 0.85rem;
		border-top: 1px solid hsl(var(--hsl-content) / 0.05);
	}

	.section:first-child { border-top: none; }

	/* ─── routing flow ─── */
	.flow {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.6rem;
		align-items: stretch;
		padding: 0.4rem 1rem 0.9rem;
	}

	@media (min-width: 768px) {
		.flow {
			grid-template-columns: 1fr auto 1fr;
			gap: 0.4rem;
			align-items: center;
		}
	}

	.node {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 0.85rem 1rem;
		border: 1px solid hsl(var(--hsl-content) / 0.1);
		border-radius: 10px;
		background: hsl(var(--hsl-base-100));
		min-width: 0;
	}

	.node__label {
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-weight: 700;
		color: hsl(var(--hsl-content) / 0.45);
	}

	.node__main {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		min-width: 0;
	}

	.node__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		flex-shrink: 0;
		border-radius: 8px;
		background: hsl(var(--hsl-primary) / 0.1);
		color: hsl(var(--hsl-primary));
		font-size: 0.85rem;
	}

	.node__url {
		font-family: var(--ffml-mono);
		font-size: 0.875rem;
		font-weight: 600;
		color: hsl(var(--hsl-content));
		overflow-wrap: anywhere;
		min-width: 0;
	}
	.node__url:hover { color: hsl(var(--hsl-primary)); }

	.node__type { font-size: 0.875rem; font-weight: 600; color: hsl(var(--hsl-content)); }

	.node__dest {
		font-family: var(--ffml-mono);
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content) / 0.85);
		overflow-wrap: anywhere;
		padding-left: 2.55rem;
		margin-top: -0.15rem;
	}
	a.node__dest:hover { color: hsl(var(--hsl-primary)); }

	.node__copy {
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.4);
		cursor: pointer;
		padding: 0.15rem 0.3rem;
		border-radius: 4px;
		margin-left: auto;
		transition: color 0.15s ease, background 0.15s ease;
	}
	.node__copy:hover { color: hsl(var(--hsl-content)); background: hsl(var(--hsl-content) / 0.06); }

	/* connector + auth gate */
	.connector {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		color: hsl(var(--hsl-content) / 0.3);
		padding: 0.1rem 0.4rem;
	}

	.connector__arrow { font-size: 1rem; }
	.connector__arrow.is-vert { display: block; }
	.connector__arrow.is-horiz { display: none; }

	@media (min-width: 768px) {
		.connector { padding: 0 0.75rem; }
		.connector__arrow.is-vert { display: none; }
		.connector__arrow.is-horiz { display: block; }
	}

	.gate {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.7rem;
		font-weight: 600;
		white-space: nowrap;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		border: 1px solid hsl(var(--hsl-warning) / 0.35);
		background: hsl(var(--hsl-warning) / 0.12);
		color: hsl(var(--hsl-warning));
	}
	.gate.is-public {
		border-color: hsl(var(--hsl-content) / 0.15);
		background: hsl(var(--hsl-content) / 0.05);
		color: hsl(var(--hsl-content) / 0.55);
	}

	/* ─── spec grid ─── */
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

	.spec__copy {
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.35);
		cursor: pointer;
		padding: 0.15rem 0.3rem;
		border-radius: 3px;
		transition: color 0.15s ease, background 0.15s ease;
	}
	.spec__copy:hover { color: hsl(var(--hsl-content)); background: hsl(var(--hsl-content) / 0.06); }

	/* ─── auth detail ─── */
	.group__head { display: flex; flex-direction: column; gap: 0.2rem; margin-bottom: 0.6rem; }
	.group__title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		font-size: 0.875rem;
		color: hsl(var(--hsl-content));
	}
	.group__desc {
		font-size: 0.8125rem;
		line-height: 1.5;
		color: hsl(var(--hsl-content) / 0.65);
	}

	.headers {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-top: 0.15rem;
	}
	.header-chip {
		font-family: var(--ffml-mono);
		font-size: 0.75rem;
		padding: 0.12rem 0.5rem;
		border-radius: 5px;
		background: hsl(var(--hsl-content) / 0.06);
		color: hsl(var(--hsl-content) / 0.8);
	}
	.is-dim { color: hsl(var(--hsl-content) / 0.45); }
</style>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/route?project=${project}`} class="link"><h6>Routes</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6 class="font-mono">{route.domain}{route.path}</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div>
		<h4><strong>Route detail</strong></h4>
		<p class="page-sub">Where this route forwards traffic and how it's protected.</p>
	</div>
	<div class="flex gap-3">
		<a class="button is-variant-secondary is-icon-left"
			href={fullUrl}
			target="_blank"
			rel="noreferrer">
			<i class="fa-solid fa-arrow-up-right-from-square"></i>
			Visit
		</a>
		<GuardedButton permission="route.create" class="button is-icon-left" href={`/route/edit?${params}`}>
			<i class="fa-solid fa-pencil"></i>
			Edit
		</GuardedButton>
	</div>
</div>

<!-- ─── ROUTING ─── -->
<div class="shell">
	<header class="rail">
		<h6 class="rail__brand">Routing</h6>
		<div class="rail__stats">
			<span class="stat">
				<span class="stat__unit">Access</span>
				<span class="stat__value">{authLabel}</span>
			</span>
		</div>
	</header>

	<div class="body">
		<!-- request flow: source → (auth gate) → destination -->
		<div class="flow">
			<div class="node">
				<span class="node__label">Incoming request</span>
				<div class="node__main">
					<span class="node__icon"><i class="fa-solid fa-globe"></i></span>
					<a class="node__url" href={fullUrl} target="_blank" rel="noreferrer">{route.domain}{route.path}</a>
					<span class="node__copy copy" data-clipboard-text={fullUrl} title="Copy URL">
						<i class="fa-light fa-copy"></i>
					</span>
				</div>
			</div>

			<div class="connector">
				<i class="connector__arrow is-horiz fa-solid fa-arrow-right-long"></i>
				<i class="connector__arrow is-vert fa-solid fa-arrow-down-long"></i>
				<span class="gate" class:is-public={authType === 'none'}>
					<i class="fa-solid {authIcon}"></i>
					{authLabel}
				</span>
			</div>

			<div class="node">
				<span class="node__label">Forwards to</span>
				<div class="node__main">
					<span class="node__icon"><i class="fa-solid {targetIcon}"></i></span>
					<span class="node__type">{typeLabel}</span>
				</div>
				{#if deploymentUrl}
					<a class="node__dest" href={deploymentUrl}>{parsed.value}</a>
				{:else if parsed.value}
					<span class="node__dest">{parsed.value}</span>
				{:else}
					<span class="node__dest is-dim">—</span>
				{/if}
			</div>
		</div>

		<!-- detailed spec -->
		<section class="section">
			<div class="spec-grid">
				<div class="spec">
					<span class="spec__label">Location</span>
					<span class="spec__value is-mono">{route.location}</span>
					<span></span>
				</div>
				<div class="spec">
					<span class="spec__label">Type</span>
					<span class="spec__value">{typeLabel}</span>
					<span></span>
				</div>
				<div class="spec">
					<span class="spec__label">Domain</span>
					<span class="spec__value is-mono">{route.domain}</span>
					<span class="spec__copy copy" data-clipboard-text={route.domain} title="Copy domain">
						<i class="fa-light fa-copy"></i>
					</span>
				</div>
				<div class="spec">
					<span class="spec__label">Path</span>
					<span class="spec__value is-mono">{route.path}</span>
					<span></span>
				</div>
				<div class="spec">
					<span class="spec__label">Destination</span>
					{#if parsed.value}
						<span class="spec__value is-mono">{parsed.value}</span>
						<span class="spec__copy copy" data-clipboard-text={parsed.value} title="Copy destination">
							<i class="fa-light fa-copy"></i>
						</span>
					{:else}
						<span class="spec__value is-dim">—</span>
						<span></span>
					{/if}
				</div>
				{#if hostOverride}
					<div class="spec">
						<span class="spec__label">Host header</span>
						<span class="spec__value is-mono">{hostOverride}</span>
						<span class="spec__copy copy" data-clipboard-text={hostOverride} title="Copy host header">
							<i class="fa-light fa-copy"></i>
						</span>
					</div>
				{/if}
				<div class="spec">
					<span class="spec__label">Created</span>
					<span class="spec__value">
						<span class="is-mono">{format.datetime(route.createdAt) || '—'}</span>
						{#if route.createdBy}<span class="spec__label"> by {route.createdBy}</span>{/if}
					</span>
					<span></span>
				</div>
			</div>
		</section>
	</div>
</div>

<!-- ─── AUTHENTICATION ─── -->
<div class="shell">
	<header class="rail">
		<h6 class="rail__brand">Authentication</h6>
		<div class="rail__stats">
			<span class="stat">
				<i class="fa-solid {authIcon}" style="color: hsl(var(--hsl-content) / 0.5)"></i>
				<span class="stat__value">{authLabel}</span>
			</span>
		</div>
	</header>
	<div class="body">
		<section class="section">
			{#if basic}
				<div class="group__head">
					<div class="group__title"><i class="fa-solid fa-lock" style="color: hsl(var(--hsl-warning))"></i> Basic Auth</div>
					<p class="group__desc">Visitors must enter a username and password before the request is forwarded.</p>
				</div>
				<div class="spec-grid">
					<div class="spec">
						<span class="spec__label">Username</span>
						<span class="spec__value is-mono">{basic.user}</span>
						<span></span>
					</div>
					<div class="spec">
						<span class="spec__label">Password</span>
						<span class="spec__value is-mono is-dim">••••••••</span>
						<span></span>
					</div>
				</div>
			{:else if fwd}
				<div class="group__head">
					<div class="group__title"><i class="fa-solid fa-shield-halved" style="color: hsl(var(--hsl-warning))"></i> Forward Auth</div>
					<p class="group__desc">Each request is first sent to an external auth server, which decides whether to allow it.</p>
				</div>
				<div class="spec-grid">
					<div class="spec">
						<span class="spec__label">Auth server</span>
						<span class="spec__value is-mono">{fwd.target}</span>
						<span class="spec__copy copy" data-clipboard-text={fwd.target} title="Copy target">
							<i class="fa-light fa-copy"></i>
						</span>
					</div>
					<div class="spec">
						<span class="spec__label">Request headers</span>
						<span class="spec__value">
							{#if reqHeaders.length}
								<span class="headers">
									{#each reqHeaders as h, i (i)}<span class="header-chip">{h}</span>{/each}
								</span>
							{:else}
								<span class="is-dim">—</span>
							{/if}
						</span>
						<span></span>
					</div>
					<div class="spec">
						<span class="spec__label">Response headers</span>
						<span class="spec__value">
							{#if resHeaders.length}
								<span class="headers">
									{#each resHeaders as h, i (i)}<span class="header-chip">{h}</span>{/each}
								</span>
							{:else}
								<span class="is-dim">—</span>
							{/if}
						</span>
						<span></span>
					</div>
				</div>
			{:else}
				<div class="group__head">
					<div class="group__title"><i class="fa-solid fa-lock-open" style="color: hsl(var(--hsl-content) / 0.45)"></i> Public</div>
					<p class="group__desc">This route is open — anyone can reach it. Add Basic or Forward Auth from <a class="link" href={`/route/edit?${params}`}>Edit</a> to protect it.</p>
				</div>
			{/if}
		</section>
	</div>
</div>

<DangerZone description="Delete this route. Traffic to this domain path stops being forwarded.">
	<GuardedButton permission="route.delete" class="button is-variant-negative" type="button" onclick={deleteRoute}>Delete route</GuardedButton>
</DangerZone>
