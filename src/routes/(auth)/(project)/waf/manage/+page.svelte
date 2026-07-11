<script lang="ts">
	import type { PageData } from './$types'
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import DangerZone from '$lib/components/DangerZone.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import WafTestPanel from '$lib/components/WafTestPanel.svelte'
	import WafCopyModal from '$lib/components/WafCopyModal.svelte'
	import Select from '$lib/components/Select.svelte'
	import TagInput from '$lib/components/TagInput.svelte'
	import type { RuleForm } from '$lib/waf/rules'
	import { actionLabels, normalizeRules, toApiRules } from '$lib/waf/rules'
	import type { LimitForm } from '$lib/waf/limits'
	import { describeKey, keyRowToApi, modeLabels, normalizeLimits, toApiLimits } from '$lib/waf/limits'
	import { wafListRefs } from '$lib/waf/expression'
	import { managedForm, managedFormError, modeOptions, paranoiaLevels, toApiManaged } from '$lib/waf/managed'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const location = $derived(data.location)
	const managedRulesSupported = $derived(data.managedRulesSupported)

	let copyModal = $state<WafCopyModal>()

	// The list reflects SERVER state for this location. Navigating away and back
	// (e.g. from the edit page) reloads the loader, which re-seeds this copy.
	let description = $state(untrack(() => data.zone?.description ?? ''))
	let rules = $state(untrack(() => normalizeRules(data.zone?.rules)))
	let limits = $state(untrack(() => normalizeLimits(data.zone?.limits)))
	let managed = $state(untrack(() => managedForm(data.zone?.managedRules)))
	// Last-saved managed block, echoed on every rule/limit write so an unsaved
	// card edit never rides along a rule save (waf.set replaces the whole zone,
	// so SOMETHING must always be sent for managed rules — the server state).
	let savedManaged = $state<Api.WafManagedRules | null>(untrack(() => data.zone?.managedRules ?? null))

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
				managed = managedForm(next.zone?.managedRules)
				savedManaged = next.zone?.managedRules ?? null
			}
		})
	})

	let savingDescription = $state(false)

	// The test panel dry-runs the zone AS SAVED (the same rows the tables
	// show), mapped back to the API shape waf.test expects.
	const testRules = $derived(toApiRules(rules))
	const testLimits = $derived(toApiLimits(limits))

	async function reloadZone () {
		const resp = await api.invoke<Api.WafZone>('waf.get', { project, location }, fetch)
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
		managed = managedForm(zone?.managedRules)
		savedManaged = zone?.managedRules ?? null
	}

	// Persist the whole zone (priority follows row order). waf.set replaces the
	// entire zone, so rules, limits, and the managed-rules block must always
	// travel together. On error, surface it and reload from the server so the
	// UI matches reality.
	async function persistZone (nextRules: RuleForm[], nextLimits: LimitForm[] = limits, nextManaged: Api.WafManagedRules | null = savedManaged) {
		const resp = await api.invoke('waf.set', {
			project,
			location,
			description,
			rules: toApiRules(nextRules),
			limits: toApiLimits(nextLimits),
			// Omitted (undefined) = cleared server-side, which is exactly the
			// state a null savedManaged mirrors.
			managedRules: nextManaged ?? undefined
		}, fetch)
		if (!resp.ok) {
			modal.error({ error: resp.error })
			await reloadZone()
			return false
		}
		return true
	}

	let savingManaged = $state(false)
	const managedError = $derived(managedFormError(managed))
	// Nothing to save while the block is off and the server has none — saving
	// would only persist untouched defaults as tuning.
	const managedSaveDisabled = $derived((!managed.enabled && savedManaged == null) || managedError !== '')

	async function saveManagedRules () {
		if (savingManaged || managedSaveDisabled) return
		savingManaged = true
		try {
			const block = toApiManaged(managed)
			if (await persistZone(rules, limits, block)) {
				savedManaged = block
				managed = managedForm(block)
			}
		} finally {
			savingManaged = false
		}
	}

	// A location can lose the managed-rules feature flag while a zone still
	// carries an ENABLED block (ops un-flagging, or a block set via CLI). The
	// server rejects any save echoing enabled:true in an un-flagged location,
	// which would make every rule/limit save on this page fail — so offer the
	// one write the gate does accept: enabled:false with the tuning kept.
	async function disableManagedRules () {
		if (savingManaged || !savedManaged) return
		savingManaged = true
		try {
			const block = { ...savedManaged, enabled: false }
			if (await persistZone(rules, limits, block)) {
				savedManaged = block
				managed = managedForm(block)
			}
		} finally {
			savingManaged = false
		}
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
		goto(`/waf/edit?project=${project}&location=${encodeURIComponent(location)}&rule=${encodeURIComponent(rule.id)}`)
	}

	function addRule () {
		goto(`/waf/edit?project=${project}&location=${encodeURIComponent(location)}`)
	}

	function removeLimit (i: number) {
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

	function editLimit (limit: LimitForm) {
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
	<div class="flex gap-3">
		<GuardedButton permission={['waf.set', 'waf.list']} class="button is-variant-secondary is-icon-left"
			onclick={() => copyModal?.open(location)}>
			<i class="fa-solid fa-copy"></i>
			Copy to location
		</GuardedButton>
		<a class="button is-variant-secondary is-icon-left"
			href={`/waf/metrics?project=${project}&location=${encodeURIComponent(location)}`}>
			<i class="fa-solid fa-chart-simple"></i>
			View metrics
		</a>
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
				<GuardedButton permission="waf.set" class="button is-variant-secondary is-size-small"
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
								{#each wafListRefs(rule.expression) as ref (ref)}
									<a class="list-chip" href={`/waf/lists?project=${project}`}
										title={`References the IP list "${ref}"`}>
										<i class="fa-solid fa-list"></i>{ref}
									</a>
								{/each}
							</td>
							<td>
								<span class="action-badge" data-action={rule.action}>
									{actionLabels[rule.action] ?? rule.action}
								</span>
							</td>
							<td>
								<div class="flex gap-1 justify-end">
									<GuardedButton permission="waf.set" class="icon-button" aria-label="Edit rule"
										onclick={() => editRule(rule)}>
										<i class="fa-solid fa-pencil"></i>
									</GuardedButton>
									<GuardedButton permission="waf.set" class="icon-button" aria-label="Move rule up"
										disabled={i === 0} onclick={() => moveRule(i, -1)}>
										<i class="fa-solid fa-chevron-up"></i>
									</GuardedButton>
									<GuardedButton permission="waf.set" class="icon-button" aria-label="Move rule down"
										disabled={i === rules.length - 1} onclick={() => moveRule(i, 1)}>
										<i class="fa-solid fa-chevron-down"></i>
									</GuardedButton>
									<GuardedButton permission="waf.set" class="icon-button" aria-label="Remove rule"
										onclick={() => removeRule(i)}>
										<i class="fa-solid fa-trash-alt"></i>
									</GuardedButton>
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
							<GuardedButton permission="waf.set" class="button is-variant-secondary flex m-auto"
								onclick={addRule}>
								<i class="fa-solid fa-plus mr-3"></i>
								<span>Add Rule</span>
							</GuardedButton>
						</td>
					</tr>
				</tfoot>
			</table>
		</div>

		<br>
		<hr>
		<br>

		<div>
			<h6><strong>Managed rules</strong> <span class="text-content/50">(OWASP Core Rule Set)</span></h6>
			<p class="text-content/50 text-sm mt-1">
				Curated signatures for SQL injection, XSS, path traversal, and
				scanner traffic. Runs after your rules, before rate limits — a
				managed-rule block never consumes rate budget.
			</p>
		</div>

		{#if !managedRulesSupported}
			<div class="managed-unavailable">
				<i class="fa-solid fa-circle-info"></i>
				<span>Not available in this location</span>
			</div>
			{#if savedManaged}
				<p class="text-content/60 text-sm">
					This zone still carries a stored managed-rules block:
					<span class="font-mono">{savedManaged.enabled ? 'enabled' : 'disabled'}</span>
					· {savedManaged.mode === 'detect' ? 'detect' : 'enforce'}
					· paranoia level {savedManaged.paranoiaLevel || 1}
					· threshold {savedManaged.anomalyThreshold || 5}
					{#if savedManaged.excludedRules?.length}
						· {savedManaged.excludedRules.length} excluded rule{savedManaged.excludedRules.length === 1 ? '' : 's'}
					{/if}
				</p>
				{#if savedManaged.enabled}
					<p class="text-content/60 text-sm">
						While the block stays enabled, saves in this location are
						rejected. Disable it (your tuning is kept) to keep managing
						rules and rate limits here.
					</p>
					<div class="flex justify-self-start">
						<GuardedButton permission="waf.set" class="button is-variant-secondary is-size-small"
							loading={savingManaged} onclick={disableManagedRules}>
							Disable managed rules
						</GuardedButton>
					</div>
				{/if}
			{/if}
		{:else}
			<label class="checkbox">
				<input id="managed-enabled" type="checkbox" bind:checked={managed.enabled}>
				Enabled
			</label>

			{#if !managed.enabled && savedManaged != null}
				<p class="text-content/60 text-sm">
					Disabled — your tuning is kept for re-enable.
				</p>
			{/if}

			<div class="grid gap-4 lg:grid-cols-2">
				<div class="field">
					<label for="managed-mode">Mode</label>
					<Select id="managed-mode" bind:value={managed.mode} options={modeOptions}
						disabled={!managed.enabled} />
					<p class="text-content/50 text-sm mt-2">
						Detect-only matches are currently visible to platform operators
						only (ask support for your zone’s match report); per-project
						match metrics arrive in a later release.
					</p>
				</div>

				<div class="field">
					<label for="managed-threshold">Anomaly threshold</label>
					<div class="input">
						<input id="managed-threshold" type="number" min="1" max="100"
							bind:value={managed.anomalyThreshold} disabled={!managed.enabled}>
					</div>
					<p class="text-content/50 text-sm mt-2">
						Each critical match scores 5; lower = stricter. Default 5.
					</p>
				</div>
			</div>

			<div class="field">
				<span class="label">Paranoia level</span>
				<div class="paranoia-switch" role="group" aria-label="Paranoia level">
					{#each paranoiaLevels as pl (pl.value)}
						<button type="button" class="paranoia-btn"
							class:is-active={managed.paranoiaLevel === pl.value}
							aria-pressed={managed.paranoiaLevel === pl.value}
							disabled={!managed.enabled}
							onclick={() => { managed.paranoiaLevel = pl.value }}>{pl.label}</button>
					{/each}
				</div>
				<p class="text-content/50 text-sm mt-2">
					{paranoiaLevels.find((pl) => pl.value === managed.paranoiaLevel)?.description}
				</p>
			</div>

			<div class="field">
				<label for="managed-excluded">Excluded rules</label>
				<div class="managed-excluded" class:is-disabled={!managed.enabled}>
					<TagInput id="managed-excluded" bind:tags={managed.excludedRules}
						disabled={!managed.enabled}
						placeholder="CRS rule id, e.g. 942100" />
				</div>
				<p class="text-content/50 text-sm mt-2">
					CRS rule ids to disable for false-positive relief
					(<a class="link" href="https://coreruleset.org/docs/" target="_blank" rel="noreferrer">CRS rule reference</a>).
				</p>
				{#if managedError}
					<p class="text-negative text-sm mt-1">{managedError}</p>
				{/if}
			</div>

			<div class="flex justify-self-start">
				<GuardedButton permission="waf.set" class="button is-variant-secondary is-size-small"
					loading={savingManaged} disabled={managedSaveDisabled} onclick={saveManagedRules}>
					Save managed rules
				</GuardedButton>
			</div>
		{/if}

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
									{#each wafListRefs(limit.filter) as ref (ref)}
										<a class="list-chip" href={`/waf/lists?project=${project}`}
											title={`References the IP list "${ref}"`}>
											<i class="fa-solid fa-list"></i>{ref}
										</a>
									{/each}
								{/if}
							</td>
							<td>
								<span class="mode-badge" data-mode={limit.mode}>
									{modeLabels[limit.mode] ?? limit.mode}
								</span>
							</td>
							<td>
								<div class="flex gap-1 justify-end">
									<GuardedButton permission="waf.set" class="icon-button" aria-label="Edit rate limit"
										onclick={() => editLimit(limit)}>
										<i class="fa-solid fa-pencil"></i>
									</GuardedButton>
									<GuardedButton permission="waf.set" class="icon-button" aria-label="Remove rate limit"
										onclick={() => removeLimit(i)}>
										<i class="fa-solid fa-trash-alt"></i>
									</GuardedButton>
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
							<GuardedButton permission="waf.set" class="button is-variant-secondary flex m-auto"
								onclick={addLimit}>
								<i class="fa-solid fa-plus mr-3"></i>
								<span>Add Limit</span>
							</GuardedButton>
						</td>
					</tr>
				</tfoot>
			</table>
		</div>

		<br>
		<hr>
		<br>

		<WafTestPanel {project} {location} rules={testRules} limits={testLimits} />

		<DangerZone description="Disable the firewall in this location and permanently remove all of its rules and rate limits.">
			<GuardedButton permission="waf.delete" class="button is-variant-negative" onclick={deleteZone}>Disable firewall</GuardedButton>
		</DangerZone>
	</div>
</div>

<WafCopyModal bind:this={copyModal} {project} locations={data.locations} />

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

	/* Marks a rule/limit whose expression references a named IP list; links to
	   the lists page. */
	.list-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		margin-left: 0.4rem;
		padding: 0.125rem 0.5rem;
		border-radius: 9999px;
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		font-weight: 600;
		line-height: 1.5;
		color: hsl(var(--hsl-primary));
		background-color: hsl(var(--hsl-primary) / 0.1);
	}

	.list-chip:hover {
		background-color: hsl(var(--hsl-primary) / 0.18);
	}

	/* Managed rules aren't offered here — an informative dead-end, not an error. */
	.managed-unavailable {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.75rem 1rem;
		border-radius: 0.625rem;
		border: 1px dashed hsl(var(--hsl-line));
		color: hsl(var(--hsl-content) / 0.55);
		font-size: 0.875rem;
	}

	/* Segmented 1–4 picker, visually matching RangeSwitch (which is hardwired
	   to the metrics time ranges, so it can't be reused directly). */
	.paranoia-switch {
		display: inline-flex;
		padding: 0.1875rem;
		gap: 0.125rem;
		border-radius: 0.625rem;
		background: hsl(var(--hsl-base-200));
		border: 1px solid hsl(var(--hsl-line) / 0.7);
		width: fit-content;
	}

	.paranoia-btn {
		padding: 0.3125rem 0.875rem;
		border-radius: 0.4375rem;
		font-size: 0.75rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: hsl(var(--hsl-content) / 0.6);
		transition: color var(--timing-fastest) ease, background var(--timing-fastest) ease;
	}

	.paranoia-btn:hover:not(:disabled) {
		color: hsl(var(--hsl-content) / 0.9);
	}

	.paranoia-btn.is-active {
		color: hsl(var(--hsl-primary-content));
		background: hsl(var(--hsl-primary));
	}

	.paranoia-btn:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	/* The TagInput itself is disabled while the block is off (mouse AND
	   keyboard); this only mutes the kept-but-frozen tuning visually. */
	.managed-excluded.is-disabled {
		opacity: 0.55;
	}
</style>
