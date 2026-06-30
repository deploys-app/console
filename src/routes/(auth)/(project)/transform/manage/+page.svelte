<script lang="ts">
	import type { PageData } from './$types'
	import type { RuleForm } from '$lib/transform/rules'
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import DangerZone from '$lib/components/DangerZone.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import {
		phaseLabels,
		modeLabels,
		describeRule,
		normalizeRules,
		toApiRules
	} from '$lib/transform/rules'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const location = $derived(data.location)

	// The list reflects SERVER state for this location. Navigating away and back
	// (e.g. from the edit page) reloads the loader, which re-seeds this copy.
	let description = $state(untrack(() => data.zone?.description ?? ''))
	let rules = $state(untrack(() => normalizeRules(data.zone?.transforms)))

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
				rules = normalizeRules(next.zone?.transforms)
			}
		})
	})

	let savingDescription = $state(false)

	async function reloadZone () {
		const resp = await api.invoke<Api.TransformZone>('transform.get', { project, location }, fetch)
		if (!resp.ok) {
			if (resp.error?.notFound) {
				// The zone disappeared underneath us — back to the index.
				goto(`/transform?project=${project}`)
				return
			}
			modal.error({ error: resp.error })
			return
		}
		const zone = resp.result ?? null
		description = zone?.description ?? ''
		rules = normalizeRules(zone?.transforms)
	}

	// Persist the whole zone (priority follows row order). transform.set replaces
	// the entire zone, so every rule must always travel together. On error,
	// surface it and reload from the server so the UI matches reality.
	async function persistZone (nextRules: RuleForm[]) {
		const resp = await api.invoke('transform.set', {
			project,
			location,
			description,
			transforms: toApiRules(nextRules)
		}, fetch)
		if (!resp.ok) {
			modal.error({ error: resp.error })
			await reloadZone()
			return false
		}
		return true
	}

	async function moveRule (i: number, dir: -1 | 1) {
		const j = i + dir
		if (j < 0 || j >= rules.length) return
		const next = [...rules]
		;[next[i], next[j]] = [next[j], next[i]]
		rules = next
		await persistZone(next)
	}

	function removeRule (i: number) {
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

	function editRule (rule: RuleForm) {
		goto(`/transform/edit?project=${project}&location=${encodeURIComponent(location)}&rule=${encodeURIComponent(rule.id)}`)
	}

	function addRule () {
		goto(`/transform/edit?project=${project}&location=${encodeURIComponent(location)}`)
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
			title: `Disable transform in ${location}? All rules will be removed.`,
			yes: 'Disable',
			callback: async () => {
				const resp = await api.invoke('transform.delete', { project, location }, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				goto(`/transform?project=${project}`)
			}
		})
	}
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/transform?project=${project}`} class="link"><h6>Transform</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6 class="font-mono">{location}</h6>
	</div>
	<div class="breadcrumb-item">
		<h6>Manage</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div>
		<h4><strong>Transform rules</strong></h4>
		<p class="page-sub">
			Rules that rewrite requests and responses in <span class="font-mono">{location}</span>
		</p>
	</div>
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
				<GuardedButton permission="transform.set" class="button is-variant-secondary is-size-small"
					loading={savingDescription} onclick={saveDescription}>
					Save
				</GuardedButton>
			</div>
		</div>

		<br>
		<hr>
		<br>

		<div class="flex items-center justify-between">
			<div>
				<h6><strong>Rules</strong></h6>
				<p class="text-content/50 text-sm mt-1">
					Within a phase, rules run top to bottom (lower priority first); across
					phases there is no global order — request rules run at request time,
					response rules at response time. Use <strong>Edit</strong> to change a
					rule's phase, condition, and operations.
				</p>
			</div>
		</div>

		<div class="table-container">
			<table class="table is-variant-compact">
				<thead>
					<tr>
						<th>ID</th>
						<th>Phase</th>
						<th>Description</th>
						<th>Operations</th>
						<th>Mode</th>
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
								<span class="phase-badge" data-phase={rule.phase}>
									{phaseLabels[rule.phase] ?? rule.phase}
								</span>
							</td>
							<td>
								{#if rule.description}
									{rule.description}
								{:else}
									<span class="text-content/40">—</span>
								{/if}
								{#if rule.filter}
									<div class="font-mono text-xs text-content/50 mt-1 truncate max-w-56" title={rule.filter}>
										<i class="fa-solid fa-filter mr-1"></i>{rule.filter}
									</div>
								{/if}
							</td>
							<td>
								<span class="text-sm text-content/70">{describeRule(rule)}</span>
							</td>
							<td>
								<span class="mode-badge" data-mode={rule.mode}>
									{modeLabels[rule.mode] ?? rule.mode}
								</span>
							</td>
							<td>
								<div class="flex gap-1 justify-end">
									<GuardedButton permission="transform.set" class="icon-button" aria-label="Edit rule"
										onclick={() => editRule(rule)}>
										<i class="fa-solid fa-pencil"></i>
									</GuardedButton>
									<GuardedButton permission="transform.set" class="icon-button" aria-label="Move rule up"
										disabled={i === 0} onclick={() => moveRule(i, -1)}>
										<i class="fa-solid fa-chevron-up"></i>
									</GuardedButton>
									<GuardedButton permission="transform.set" class="icon-button" aria-label="Move rule down"
										disabled={i === rules.length - 1} onclick={() => moveRule(i, 1)}>
										<i class="fa-solid fa-chevron-down"></i>
									</GuardedButton>
									<GuardedButton permission="transform.set" class="icon-button" aria-label="Remove rule"
										onclick={() => removeRule(i)}>
										<i class="fa-solid fa-trash-alt"></i>
									</GuardedButton>
								</div>
							</td>
						</tr>
					{/each}
					{#if rules.length === 0}
						<tr>
							<td colspan="6" class="text-center text-content/50">
								No rules yet. Add a rule to start transforming requests and responses.
							</td>
						</tr>
					{/if}
				</tbody>
				<tfoot>
					<tr>
						<td colspan="6">
							<GuardedButton permission="transform.set" class="button is-variant-secondary flex m-auto"
								onclick={addRule}>
								<i class="fa-solid fa-plus mr-3"></i>
								<span>Add rule</span>
							</GuardedButton>
						</td>
					</tr>
				</tfoot>
			</table>
		</div>

		<DangerZone description="Disable transform in this location and permanently remove all of its rules.">
			<GuardedButton permission="transform.delete" class="button is-variant-negative" onclick={deleteZone}>Disable transform</GuardedButton>
		</DangerZone>
	</div>
</div>

<style>
	.phase-badge,
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

	.phase-badge[data-phase='request'] {
		color: hsl(var(--hsl-primary));
		background-color: hsl(var(--hsl-primary) / 0.12);
	}

	.phase-badge[data-phase='response'] {
		color: hsl(var(--hsl-accent));
		background-color: hsl(var(--hsl-accent) / 0.12);
	}

	/* Shadow only observes — render it muted so Enforce stands out. */
	.mode-badge[data-mode='shadow'] {
		color: hsl(var(--hsl-content) / 0.5);
		background-color: hsl(var(--hsl-content) / 0.05);
	}
</style>
