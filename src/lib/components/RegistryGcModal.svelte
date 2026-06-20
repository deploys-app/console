<script lang="ts">
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	interface Props {
		project: string
	}

	const { project }: Props = $props()

	let isActive = $state(false)
	let loading = $state(false)
	let submitting = $state(false)
	let result = $state<Api.RegistryGcResult | null>(null)

	const nothingToCollect = $derived(
		result !== null && result.removedManifests === 0 && result.removedTags === 0
	)

	// open runs a dry-run first so the modal previews exactly what would be
	// removed; the actual delete only happens when the user confirms.
	export async function open (): Promise<void> {
		isActive = true
		loading = true
		result = null

		const resp = await api.invoke<Api.RegistryGcResult>('registry.gc', { project, dryRun: true }, fetch)
		loading = false
		if (!resp.ok) {
			isActive = false
			modal.error({ error: resp.error })
			return
		}
		result = resp.result ?? null
	}

	function close () {
		if (submitting) return
		isActive = false
	}

	async function collect () {
		submitting = true
		const resp = await api.invoke<Api.RegistryGcResult>('registry.gc', { project, dryRun: false }, fetch)
		submitting = false
		if (!resp.ok) {
			modal.error({ error: resp.error })
			return
		}
		isActive = false
		await api.invalidate('registry.list')
		modal.success({
			content: `Removed ${resp.result?.removedManifests ?? 0} manifest(s) and ${resp.result?.removedTags ?? 0} tag(s).`
		})
	}
</script>

<div class="modal" onclick={close} class:is-active={isActive} aria-hidden={!isActive}>
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="modal-panel" onclick={(e) => e.stopPropagation()}>
		<div class="modal-close" onclick={close} onkeypress={close} tabindex="0" role="button">✕</div>
		<h4><strong>Garbage collect registry</strong></h4>
		<p class="page-sub mt-1">
			Removes manifests no deployment references — across the current revision and
			all history. Recently pushed images are kept.
		</p>

		{#if loading}
			<p class="mt-4">Calculating…</p>
		{:else if result}
			<div class="summary mt-4">
				<div><strong>{format.count(result.removedManifests)}</strong> manifests</div>
				<div><strong>{format.count(result.removedTags)}</strong> tags</div>
				<div><strong>{format.storage(result.reclaimedSize)}</strong> reclaimable</div>
			</div>

			{#if !nothingToCollect}
				<div class="table-container mt-4">
					<table class="table is-variant-compact">
						<thead>
							<tr>
								<th>Repository</th>
								<th class="is-align-right">Manifests</th>
								<th class="is-align-right">Tags</th>
								<th class="is-align-right">Reclaimable</th>
							</tr>
						</thead>
						<tbody>
							{#each result.repositories as repo (repo.repository)}
								<tr>
									<td class="wrap-anywhere">{repo.repository}</td>
									<td class="is-align-right">{format.count(repo.manifests.length)}</td>
									<td class="is-align-right">{format.count(repo.tags.length)}</td>
									<td class="is-align-right">{format.storage(repo.size)}</td>
								</tr>
							{/each}
							<NoDataRow span={4} list={result.repositories} />
						</tbody>
					</table>
				</div>
			{:else}
				<p class="mt-4">Nothing to collect — every image is still in use or recently pushed.</p>
			{/if}

			<div class="actions mt-6">
				<button class="button is-variant-tertiary" onclick={close} disabled={submitting}>Cancel</button>
				{#if !nothingToCollect}
					<button class="button is-variant-negative" class:is-loading={submitting} onclick={collect} disabled={submitting}>
						Garbage collect
					</button>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.modal-panel {
		width: 100%;
		max-width: 48rem;
	}

	.table-container {
		max-height: 360px;
		overflow: auto;
	}

	.summary {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
	}
</style>
