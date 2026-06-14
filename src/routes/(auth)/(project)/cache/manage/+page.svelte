<script>
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import DangerZone from '$lib/components/DangerZone.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import {
		actionLabels,
		modeLabels,
		describeOverride,
		normalizeOverrides,
		toApiOverrides
	} from '$lib/cache/overrides'

	const { data } = $props()

	const project = $derived(data.project)
	const location = $derived(data.location)

	// The list reflects SERVER state for this location. Navigating away and back
	// (e.g. from the edit page) reloads the loader, which re-seeds this copy.
	let description = $state(untrack(() => data.zone?.description ?? ''))
	let overrides = $state(untrack(() => normalizeOverrides(data.zone?.overrides)))

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
				overrides = normalizeOverrides(next.zone?.overrides)
			}
		})
	})

	let savingDescription = $state(false)

	async function reloadZone () {
		/** @type {Api.Response<Api.CacheZone>} */
		const resp = await api.invoke('cache.get', { project, location }, fetch)
		if (!resp.ok) {
			if (resp.error?.notFound) {
				// The zone disappeared underneath us — back to the index.
				goto(`/cache?project=${project}`)
				return
			}
			modal.error({ error: resp.error })
			return
		}
		const zone = resp.result ?? null
		description = zone?.description ?? ''
		overrides = normalizeOverrides(zone?.overrides)
	}

	// Persist the whole zone (priority follows row order). cache.set replaces the
	// entire zone, so every override must always travel together. On error,
	// surface it and reload from the server so the UI matches reality.
	/**
	 * @param {import('$lib/cache/overrides').OverrideForm[]} nextOverrides
	 */
	async function persistZone (nextOverrides) {
		const resp = await api.invoke('cache.set', {
			project,
			location,
			description,
			overrides: toApiOverrides(nextOverrides)
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
	async function moveOverride (i, dir) {
		const j = i + dir
		if (j < 0 || j >= overrides.length) return
		const next = [...overrides]
		;[next[i], next[j]] = [next[j], next[i]]
		overrides = next
		await persistZone(next)
	}

	/** @param {number} i */
	function removeOverride (i) {
		const override = overrides[i]
		if (!override) return
		modal.confirm({
			title: `Delete override ${override.id}?`,
			yes: 'Delete',
			callback: async () => {
				const next = overrides.filter((_, k) => k !== i)
				overrides = next
				await persistZone(next)
			}
		})
	}

	/** @param {import('$lib/cache/overrides').OverrideForm} override */
	function editOverride (override) {
		goto(`/cache/edit?project=${project}&location=${encodeURIComponent(location)}&override=${encodeURIComponent(override.id)}`)
	}

	function addOverride () {
		goto(`/cache/edit?project=${project}&location=${encodeURIComponent(location)}`)
	}

	async function saveDescription () {
		if (savingDescription) return
		savingDescription = true
		try {
			await persistZone(overrides)
		} finally {
			savingDescription = false
		}
	}

	function deleteZone () {
		modal.confirm({
			title: `Disable cache in ${location}? All overrides will be removed.`,
			yes: 'Disable',
			callback: async () => {
				const resp = await api.invoke('cache.delete', { project, location }, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				goto(`/cache?project=${project}`)
			}
		})
	}
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/cache?project=${project}`} class="link"><h6>Cache</h6></a>
	</div>
	<div class="breadcrumb-item">
		<a href={`/cache/metrics?project=${project}&location=${encodeURIComponent(location)}`} class="link"><h6 class="font-mono">{location}</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6>Manage</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div>
		<h4><strong>Cache overrides</strong></h4>
		<p class="page-sub">
			Overrides that force edge caching in <span class="font-mono">{location}</span>
		</p>
	</div>
	<a class="button is-variant-secondary is-icon-left"
		href={`/cache/metrics?project=${project}&location=${encodeURIComponent(location)}`}>
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
				<GuardedButton permission="cache.set" class="button is-variant-secondary is-size-small"
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
				<h6><strong>Overrides</strong></h6>
				<p class="text-content/50 text-sm mt-1">
					Overrides match top to bottom — the first match wins. Use
					<strong>Edit</strong> to change an override’s condition and caching policy.
				</p>
			</div>
		</div>

		<div class="table-container">
			<table class="table is-variant-compact">
				<thead>
					<tr>
						<th>ID</th>
						<th>Description</th>
						<th>Behavior</th>
						<th>Mode</th>
						<th class="is-collapse is-align-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each overrides as override, i (override.id)}
						<tr>
							<td>
								<span class="font-mono text-sm text-content/60">{override.id}</span>
							</td>
							<td>
								{#if override.description}
									{override.description}
								{:else}
									<span class="text-content/40">—</span>
								{/if}
								{#if override.filter}
									<div class="font-mono text-xs text-content/50 mt-1 truncate max-w-56" title={override.filter}>
										<i class="fa-solid fa-filter mr-1"></i>{override.filter}
									</div>
								{/if}
							</td>
							<td>
								<span class="action-badge" data-action={override.action}>
									{actionLabels[override.action] ?? override.action}
								</span>
								<div class="text-sm text-content/55 mt-1">{describeOverride(override)}</div>
							</td>
							<td>
								<span class="mode-badge" data-mode={override.mode}>
									{modeLabels[override.mode] ?? override.mode}
								</span>
							</td>
							<td>
								<div class="flex gap-1 justify-end">
									<GuardedButton permission="cache.set" class="icon-button" aria-label="Edit override"
										onclick={() => editOverride(override)}>
										<i class="fa-solid fa-pencil"></i>
									</GuardedButton>
									<GuardedButton permission="cache.set" class="icon-button" aria-label="Move override up"
										disabled={i === 0} onclick={() => moveOverride(i, -1)}>
										<i class="fa-solid fa-chevron-up"></i>
									</GuardedButton>
									<GuardedButton permission="cache.set" class="icon-button" aria-label="Move override down"
										disabled={i === overrides.length - 1} onclick={() => moveOverride(i, 1)}>
										<i class="fa-solid fa-chevron-down"></i>
									</GuardedButton>
									<GuardedButton permission="cache.set" class="icon-button" aria-label="Remove override"
										onclick={() => removeOverride(i)}>
										<i class="fa-solid fa-trash-alt"></i>
									</GuardedButton>
								</div>
							</td>
						</tr>
					{/each}
					{#if overrides.length === 0}
						<tr>
							<td colspan="5" class="text-center text-content/50">
								No overrides yet. Add an override to start forcing edge caching.
							</td>
						</tr>
					{/if}
				</tbody>
				<tfoot>
					<tr>
						<td colspan="5">
							<GuardedButton permission="cache.set" class="button is-variant-secondary flex m-auto"
								onclick={addOverride}>
								<i class="fa-solid fa-plus mr-3"></i>
								<span>Add override</span>
							</GuardedButton>
						</td>
					</tr>
				</tfoot>
			</table>
		</div>

		<DangerZone description="Disable cache in this location and permanently remove all of its overrides.">
			<GuardedButton permission="cache.delete" class="button is-variant-negative" onclick={deleteZone}>Disable cache</GuardedButton>
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

	.action-badge[data-action='cache'] {
		color: hsl(var(--hsl-positive));
		background-color: hsl(var(--hsl-positive) / 0.12);
	}

	.action-badge[data-action='bypass'] {
		color: hsl(var(--hsl-warning));
		background-color: hsl(var(--hsl-warning) / 0.14);
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
