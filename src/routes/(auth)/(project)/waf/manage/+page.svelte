<script>
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import DangerZone from '$lib/components/DangerZone.svelte'
	import { actionLabels, normalizeRules, toApiRules } from '$lib/waf/rules'

	const { data } = $props()

	const project = $derived(data.project)
	const location = $derived(data.location)

	// The list reflects SERVER state for this location. Navigating away and back
	// (e.g. from the edit page) reloads the loader, which re-seeds this copy.
	let description = $state(untrack(() => data.zone?.description ?? ''))
	let rules = $state(untrack(() => normalizeRules(data.zone?.rules)))

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
	}

	// Persist the whole zone (priority follows row order). On error, surface it
	// and reload from the server so the UI matches reality.
	/** @param {import('$lib/waf/rules').RuleForm[]} nextRules */
	async function persistZone (nextRules) {
		const resp = await api.invoke('waf.set', {
			project,
			location,
			description,
			rules: toApiRules(nextRules)
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
	async function removeRule (i) {
		const next = rules.filter((_, k) => k !== i)
		rules = next
		await persistZone(next)
	}

	/** @param {import('$lib/waf/rules').RuleForm} rule */
	function editRule (rule) {
		goto(`/waf/edit?project=${project}&location=${encodeURIComponent(location)}&rule=${encodeURIComponent(rule.id)}`)
	}

	function addRule () {
		goto(`/waf/edit?project=${project}&location=${encodeURIComponent(location)}`)
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
			title: `Disable the firewall in ${location}? All rules will be removed.`,
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
		<h6 class="font-mono">{location}</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div>
		<h4><strong>Firewall</strong></h4>
		<p class="page-sub">
			Web application firewall rules in <span class="font-mono">{location}</span>
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

		<DangerZone description="Disable the firewall in this location and permanently remove all of its rules.">
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
</style>
