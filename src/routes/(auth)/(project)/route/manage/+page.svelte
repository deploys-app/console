<script>
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import DangerZone from '$lib/components/DangerZone.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const route = $derived(data.route)

	const params = $derived(`project=${project}` +
		`&location=${encodeURIComponent(route.location)}` +
		`&domain=${encodeURIComponent(route.domain)}` +
		`&path=${encodeURIComponent(route.path)}`)

	// Known target schemes (mirrors api.RouteTargetPrefix).
	const targetPrefixes = ['deployment://', 'redirect://', 'ipfs://', 'ipns://', 'dnslink://']

	/** @param {string | undefined} target */
	function splitTarget (target) {
		for (const p of targetPrefixes) {
			if (target?.startsWith(p)) return { prefix: p, value: target.slice(p.length) }
		}
		return { prefix: 'deployment://', value: target ?? '' }
	}

	const parsed = $derived(splitTarget(route.target))
	const typeLabel = $derived(
		{ 'deployment://': 'Deployment', 'redirect://': 'Redirect' }[parsed.prefix] ?? parsed.prefix
	)

	const authSummary = $derived.by(() => {
		const cfg = route.config ?? {}
		if (cfg.basicAuth) return `Basic Auth (user: ${cfg.basicAuth.user})`
		if (cfg.forwardAuth) return `Forward Auth (${cfg.forwardAuth.target})`
		return 'None'
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
			href={`https://${route.domain}${route.path}`}
			target="_blank"
			rel="noreferrer">
			<i class="fa-solid fa-arrow-up-right-from-square"></i>
			Visit
		</a>
		<a class="button is-icon-left" href={`/route/edit?${params}`}>
			<i class="fa-solid fa-pencil"></i>
			Edit
		</a>
	</div>
</div>

<div class="panel is-level-300 grid gap-6">
	<div class="grid gap-4 w-full">
		<div class="field">
			<label for="view-location">Location</label>
			<div class="input">
				<input id="view-location" class="font-mono" value={route.location} readonly>
			</div>
		</div>

		<div class="field">
			<label for="view-domain">Domain</label>
			<div class="input">
				<input id="view-domain" class="font-mono" value={route.domain} readonly>
			</div>
		</div>

		<div class="field">
			<label for="view-path">Path</label>
			<div class="input">
				<input id="view-path" class="font-mono" value={route.path} readonly>
			</div>
		</div>

		<div class="field">
			<label for="view-type">Type</label>
			<div class="input">
				<input id="view-type" value={typeLabel} readonly>
			</div>
		</div>

		<div class="field">
			<label for="view-target">Destination</label>
			<div class="input">
				<input id="view-target" class="font-mono" value={parsed.value} readonly>
			</div>
		</div>

		<div class="field">
			<label for="view-auth">Authentication</label>
			<div class="input">
				<input id="view-auth" value={authSummary} readonly>
			</div>
		</div>

		<DangerZone description="Delete this route. Traffic to this domain path stops being forwarded.">
			<button class="button is-variant-negative" type="button" onclick={deleteRoute}>Delete route</button>
		</DangerZone>
	</div>
</div>
