<script>
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import Select from '$lib/components/Select.svelte'
	import DangerZone from '$lib/components/DangerZone.svelte'
	import { actionLabels, normalizeRules, toApiRules } from '$lib/waf/rules'

	const { data } = $props()

	const project = $derived(data.project)
	const locations = $derived(data.locations)

	// The list reflects SERVER state for the selected location. Changing the
	// location navigates (updating the URL + reloading the loader), which
	// re-seeds this local working copy.
	let location = $state(untrack(() => data.location ?? ''))
	let description = $state(untrack(() => data.zone?.description ?? ''))
	let rules = $state(untrack(() => normalizeRules(data.zone?.rules)))
	let hasZone = $state(untrack(() => !!data.zone))

	let loadedLocation = untrack(() => data.location ?? '')

	// Re-seed local state whenever the loader returns a different location/zone
	// (after navigation). Track only `data` so optimistic in-place edits aren't
	// clobbered.
	$effect(() => {
		const next = data
		untrack(() => {
			if (next.location !== loadedLocation) {
				loadedLocation = next.location ?? ''
				location = next.location ?? ''
				description = next.zone?.description ?? ''
				rules = normalizeRules(next.zone?.rules)
				hasZone = !!next.zone
			}
		})
	})

	let savingDescription = $state(false)

	/** @param {string | number} loc */
	function selectLocation (loc) {
		// Reflect the selection in the URL so the loader fetches the zone and the
		// context survives navigating to the edit page and back.
		goto(`?project=${project}&location=${encodeURIComponent(loc)}`, { keepFocus: true, noScroll: true })
	}

	async function reloadZone () {
		/** @type {Api.Response<Api.WafZone>} */
		const resp = await api.invoke('waf.get', { project, location }, fetch)
		if (!resp.ok) {
			if (resp.error?.notFound) {
				description = ''
				rules = []
				hasZone = false
				return
			}
			modal.error({ error: resp.error })
			return
		}
		const zone = resp.result ?? null
		description = zone?.description ?? ''
		rules = normalizeRules(zone?.rules)
		hasZone = !!zone
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
		hasZone = true
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
				description = ''
				rules = []
				hasZone = false
			}
		})
	}
</script>

<div class="page-head">
	<div>
		<h4><strong>Firewall</strong></h4>
		<p class="page-sub">Web application firewall rules for this location</p>
	</div>
</div>

<div class="panel is-level-300 grid gap-6">
	<div class="grid gap-4 w-full">
		<div class="field">
			<label for="input-location">Location</label>
			<Select
				id="input-location"
				value={location}
				onchange={selectLocation}
				required
				placeholder="Select Location"
				options={locations.map((it) => ({ value: it.id, label: it.id }))} />
		</div>

		{#if location}
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

			{#if hasZone}
				<DangerZone description="Disable the firewall in this location and permanently remove all of its rules.">
					<button class="button is-variant-negative" type="button" onclick={deleteZone}>Disable firewall</button>
				</DangerZone>
			{/if}
		{/if}
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
