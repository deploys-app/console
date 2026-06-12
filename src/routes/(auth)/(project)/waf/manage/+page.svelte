<script>
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import DangerZone from '$lib/components/DangerZone.svelte'
	import { actionLabels, normalizeRules, toApiRules } from '$lib/waf/rules'
	import { describeKey, keyRowToApi, modeLabels, normalizeLimits, toApiLimits } from '$lib/waf/limits'

	const { data } = $props()

	const project = $derived(data.project)
	const location = $derived(data.location)

	// The list reflects SERVER state for this location. Navigating away and back
	// (e.g. from the edit page) reloads the loader, which re-seeds this copy.
	let description = $state(untrack(() => data.zone?.description ?? ''))
	let rules = $state(untrack(() => normalizeRules(data.zone?.rules)))
	let limits = $state(untrack(() => normalizeLimits(data.zone?.limits)))

	let loadedLocation = untrack(() => data.location ?? '')

	// Re-seed local state whenever the loader returns a different location/zone
	// (after navigation). Track only `data` so optimistic in-place edits aren't
	// clobbered.
	$effect(() => {
		const next = data
		untrack(() => {
			if (next.location !== loadedLocation) {
				loadedLocation = next.location ?? ''
				description = next.zone?.description ?? ''
				rules = normalizeRules(next.zone?.rules)
				limits = normalizeLimits(next.zone?.limits)
			}
		})
	})

	let savingDescription = $state(false)

	async function reloadZone () {
		/** @type {Api.Response<Api.WafZone>} */
		const resp = await api.invoke('waf.get', { project, location }, fetch)
		if (!resp.ok) {
			if (resp.error?.notFound) {
				// The zone disappeared underneath us — back to the index.
				goto(`/waf?project=${project}`)
				return
			}
			modal.error({ error: resp.error })
			return
		}
		const zone = resp.result ?? null
		description = zone?.description ?? ''
		rules = normalizeRules(zone?.rules)
		limits = normalizeLimits(zone?.limits)
	}

	// Persist the whole zone (priority follows row order). waf.set replaces the
	// entire zone, so rules and limits must always travel together. On error,
	// surface it and reload from the server so the UI matches reality.
	/**
	 * @param {import('$lib/waf/rules').RuleForm[]} nextRules
	 * @param {import('$lib/waf/limits').LimitForm[]} [nextLimits]
	 */
	async function persistZone (nextRules, nextLimits = limits) {
		const resp = await api.invoke('waf.set', {
			project,
			location,
			description,
			rules: toApiRules(nextRules),
			limits: toApiLimits(nextLimits)
		}, fetch)
		if (!resp.ok) {
			modal.error({ error: resp.error })
			await reloadZone()
			return false
		}
		return true
	}

	/**
	 * @param {number} i
	 * @param {-1 | 1} dir
	 */
	async function moveRule (i, dir) {
		const j = i + dir
		if (j < 0 || j >= rules.length) return
		const next = [...rules]
		;[next[i], next[j]] = [next[j], next[i]]
		rules = next
		await persistZone(next)
	}

	/** @param {number} i */
	function removeRule (i) {
		const rule = rules[i]
		if (!rule) return
		modal.confirm({
			title: `Delete rule ${rule.id}?`,
			yes: 'Delete',
			callback: async () => {
				const next = rules.filter((_, k) => k !== i)
				rules = next
				await persistZone(next)
			}
		})
	}

	/** @param {import('$lib/waf/rules').RuleForm} rule */
	function editRule (rule) {
		goto(`/waf/edit?project=${project}&location=${encodeURIComponent(location)}&rule=${encodeURIComponent(rule.id)}`)
	}

	function addRule () {
		goto(`/waf/edit?project=${project}&location=${encodeURIComponent(location)}`)
	}

	/** @param {number} i */
	function removeLimit (i) {
		const limit = limits[i]
		if (!limit) return
		modal.confirm({
			title: `Delete rate limit ${limit.id}?`,
			yes: 'Delete',
			callback: async () => {
				const next = limits.filter((_, k) => k !== i)
				limits = next
				await persistZone(rules, next)
			}
		})
	}

	/** @param {import('$lib/waf/limits').LimitForm} limit */
	function editLimit (limit) {
		goto(`/waf/limit?project=${project}&location=${encodeURIComponent(location)}&limit=${encodeURIComponent(limit.id)}`)
	}

	function addLimit () {
		goto(`/waf/limit?project=${project}&location=${encodeURIComponent(location)}`)
	}

	async function saveDescription () {
		if (savingDescription) return
		savingDescription = true
		try {
			await persistZone(rules)
		} finally {
			savingDescription = false
		}
	}

	function deleteZone () {
		modal.confirm({
			title: `Disable the firewall in ${location}? All rules and rate limits will be removed.`,
			yes: 'Disable',
			callback: async () => {
				const resp = await api.invoke('waf.delete', { project, location }, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				goto(`/waf?project=${project}`)
			}
		})
	}
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/waf?project=${project}`} class="link"><h6>Firewall</h6></a>
	</div>
	<div class="breadcrumb-item">
		<a href={`/waf/metrics?project=${project}&location=${encodeURIComponent(location)}`} class="link"><h6 class="font-mono">{location}</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6>Manage</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div>
		<h4><strong>Firewall rules</strong></h4>
		<p class="page-sub">
			Rules that filter incoming traffic in <span class="font-mono">{location}</span>
		</p>
	</div>
	<a class="button is-variant-secondary is-icon-left"
		href={`/waf/metrics?project=${project}&location=${encodeURIComponent(location)}`}>
		<i class="fa-solid fa-chart-simple"></i>
		View metrics
	</a>
</div>

<div class="panel is-level-300 grid gap-6">
	<div class="grid gap-4 w-full">
		<div class="field">
			<label for="input-location">Location</label>
			<div class="input">
				<input id="input-location" class="font-mono" value={location} readonly>
			</div>
		</div>

		<div class="field">
			<label for="input-description">Description</label>
			<div class="input">
				<input id="input-description" bind:value={description} placeholder="Optional description">
			</div>
			<div class="flex justify-self-start mt-2">
				<button type="button" class="button is-variant-secondary is-size-small"
					class:is-loading={savingDescription} onclick={saveDescription}>
					Save
				</button>
			</div>
		</div>

		<br>
		<hr>
		<br>

		<div class="flex items-center justify-between">
			<div>
				<h6><strong>Rules</strong></h6>
				<p class="text-content/50 text-sm mt-1">
					Rules run top to bottom. Use <strong>Edit</strong> to change a rule’s
					condition, action, and response.
				</p>
			</div>
		</div>

		<div class="table-container">
			<table class="table is-variant-compact">
				<thead>
					<tr>
						<th>ID</th>
						<th>Description</th>
						<th>Action</th>
						<th class="is-collapse is-align-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each rules as rule, i (rule.id)}
						<tr>
							<td>
								<span class="font-mono text-sm text-content/60">{rule.id}</span>
							</td>
							<td>
								{#if rule.description}
									{rule.description}
								{:else}
									<span class="text-content/40">—</span>
								{/if}
							</td>
							<td>
								<span class="action-badge" data-action={rule.action}>
									{actionLabels[rule.action] ?? rule.action}
								</span>
							</td>
							<td>
								<div class="flex gap-1 justify-end">
									<button class="icon-button" type="button" aria-label="Edit rule"
										onclick={() => editRule(rule)}>
										<i class="fa-solid fa-pencil"></i>
									</button>
									<button class="icon-button" type="button" aria-label="Move rule up"
										disabled={i === 0} onclick={() => moveRule(i, -1)}>
										<i class="fa-solid fa-chevron-up"></i>
									</button>
									<button class="icon-button" type="button" aria-label="Move rule down"
										disabled={i === rules.length - 1} onclick={() => moveRule(i, 1)}>
										<i class="fa-solid fa-chevron-down"></i>
									</button>
									<button class="icon-button" type="button" aria-label="Remove rule"
										onclick={() => removeRule(i)}>
										<i class="fa-solid fa-trash-alt"></i>
									</button>
								</div>
							</td>
						</tr>
					{/each}
					{#if rules.length === 0}
						<tr>
							<td colspan="4" class="text-center text-content/50">
								No rules yet. Add a rule to start filtering traffic.
							</td>
						</tr>
					{/if}
				</tbody>
				<tfoot>
					<tr>
						<td colspan="4">
							<button class="button is-variant-secondary flex m-auto" type="button"
								onclick={addRule}>
								<i class="fa-solid fa-plus mr-3"></i>
								<span>Add Rule</span>
							</button>
						</td>
					</tr>
				</tfoot>
			</table>
		</div>

		<br>
		<hr>
		<br>

		<div class="flex items-center justify-between">
			<div>
				<h6><strong>Rate limits</strong></h6>
				<p class="text-content/50 text-sm mt-1">
					Limit how often clients can hit your routes. Shadow mode counts
					matches without rejecting.
				</p>
			</div>
		</div>

		<div class="table-container">
			<table class="table is-variant-compact">
				<thead>
					<tr>
						<th>Description</th>
						<th>Key</th>
						<th>Limit</th>
						<th>Mode</th>
						<th class="is-collapse is-align-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each limits as limit, i (limit.id)}
						<tr>
							<td>
								{#if limit.description}
									{limit.description}
								{:else}
									<span class="text-content/40">—</span>
								{/if}
							</td>
							<td>{describeKey(limit.key.map(keyRowToApi).filter(Boolean))}</td>
							<td>
								<span class="font-mono text-sm">{limit.rate} / {limit.window}</span>
								{#if limit.filter}
									<div class="font-mono text-xs text-content/50 mt-1 truncate max-w-56" title={limit.filter}>
										<i class="fa-solid fa-filter mr-1"></i>{limit.filter}
									</div>
								{/if}
							</td>
							<td>
								<span class="mode-badge" data-mode={limit.mode}>
									{modeLabels[limit.mode] ?? limit.mode}
								</span>
							</td>
							<td>
								<div class="flex gap-1 justify-end">
									<button class="icon-button" type="button" aria-label="Edit rate limit"
										onclick={() => editLimit(limit)}>
										<i class="fa-solid fa-pencil"></i>
									</button>
									<button class="icon-button" type="button" aria-label="Remove rate limit"
										onclick={() => removeLimit(i)}>
										<i class="fa-solid fa-trash-alt"></i>
									</button>
								</div>
							</td>
						</tr>
					{/each}
					{#if limits.length === 0}
						<tr>
							<td colspan="5" class="text-center text-content/50">
								No rate limits yet. Add a limit to throttle traffic.
							</td>
						</tr>
					{/if}
				</tbody>
				<tfoot>
					<tr>
						<td colspan="5">
							<button class="button is-variant-secondary flex m-auto" type="button"
								onclick={addLimit}>
								<i class="fa-solid fa-plus mr-3"></i>
								<span>Add Limit</span>
							</button>
						</td>
					</tr>
				</tfoot>
			</table>
		</div>

		<DangerZone description="Disable the firewall in this location and permanently remove all of its rules and rate limits.">
			<button class="button is-variant-negative" type="button" onclick={deleteZone}>Disable firewall</button>
		</DangerZone>
	</div>
</div>

<style>
	.action-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.125rem 0.625rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		line-height: 1.5;
		color: hsl(var(--hsl-content) / 0.75);
		background-color: hsl(var(--hsl-content) / 0.08);
	}

	.action-badge[data-action='block'] {
		color: hsl(var(--hsl-negative));
		background-color: hsl(var(--hsl-negative) / 0.12);
	}

	.action-badge[data-action='allow'] {
		color: hsl(var(--hsl-positive));
		background-color: hsl(var(--hsl-positive) / 0.12);
	}

	.mode-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.125rem 0.625rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		line-height: 1.5;
		color: hsl(var(--hsl-content) / 0.75);
		background-color: hsl(var(--hsl-content) / 0.08);
	}

	/* Shadow only observes — render it muted so Enforce stands out. */
	.mode-badge[data-mode='shadow'] {
		color: hsl(var(--hsl-content) / 0.5);
		background-color: hsl(var(--hsl-content) / 0.05);
	}
</style>
