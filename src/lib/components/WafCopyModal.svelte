<script lang="ts">
	import Select from '$lib/components/Select.svelte'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	/**
	 * Copy a WAF zone's rules + rate limits into another WAF-capable location
	 * that has no zone yet, using only waf.list / waf.set. Rule and limit ids are
	 * server-managed and resolve against the TARGET zone, so the copy sends them
	 * blank ("") and the server mints fresh ids — which also means the copy
	 * starts with fresh metric series.
	 *
	 * The modal is self-contained: open(source) fetches a fresh waf.list so
	 * eligibility (empty targets) never trusts possibly-stale page data, and
	 * confirm re-fetches it to shrink the open→confirm race in which someone
	 * else creates a zone on the target (waf.set is a whole-zone upsert, so
	 * losing that race would silently replace their zone).
	 */

	interface Props {
		project: string
		locations: Api.Location[]
	}

	const { project, locations }: Props = $props()

	// Invalidates the async continuation of a superseded or dismissed open():
	// a late waf.list response must not overwrite state opened for another
	// source, nor pop errors after the user closed the modal.
	let openGen = 0

	let isActive = $state(false)
	let loading = $state(false)
	let submitting = $state(false)
	let source = $state('')
	let zones = $state<Api.WafZone[]>([])
	let target = $state('')
	let description = $state('')

	const sourceZone = $derived(zones.find((z) => z.location === source))

	// Eligible targets = WAF-capable ∧ no zone ∧ not the source. `locations`
	// carries the layout's session-cached feature flags; `zones` is the fresh
	// list fetched at open/confirm, so a pending zone (deploying or deleting)
	// counts as occupied.
	const eligible = $derived(locations.filter((loc) =>
		loc.features.waf &&
		loc.id !== source &&
		!zones.some((z) => z.location === loc.id)))

	export async function open (sourceLocation: string): Promise<void> {
		const gen = ++openGen
		isActive = true
		loading = true
		submitting = false
		source = sourceLocation
		target = ''
		description = ''
		zones = []

		const resp = await api.invoke<Api.WafZoneList>('waf.list', { project }, fetch)
		if (gen !== openGen) return
		loading = false
		if (!resp.ok) {
			isActive = false
			modal.error({ error: resp.error })
			return
		}
		zones = resp.result?.items ?? []

		const src = zones.find((z) => z.location === sourceLocation)
		if (!src) {
			// Deleted underneath us — surface it and refresh the stale page list.
			isActive = false
			modal.error({ error: `The firewall in ${sourceLocation} no longer exists.` })
			await api.invalidate('waf.list')
			return
		}
		description = src.description
	}

	function close () {
		if (submitting) return
		openGen++
		isActive = false
	}

	async function copy () {
		if (!target || submitting) return

		submitting = true
		try {
			// Confirm-time re-check: the modal can sit open indefinitely, and
			// waf.set has no compare-and-set — re-list so a zone created on the
			// target in the meantime is never silently replaced.
			const listResp = await api.invoke<Api.WafZoneList>('waf.list', { project }, fetch)
			if (!listResp.ok) {
				modal.error({ error: listResp.error })
				return
			}
			zones = listResp.result?.items ?? []

			const src = zones.find((z) => z.location === source)
			if (!src) {
				isActive = false
				modal.error({ error: `The firewall in ${source} no longer exists.` })
				await api.invalidate('waf.list')
				return
			}
			if (zones.some((z) => z.location === target)) {
				const taken = target
				target = ''
				modal.error({ error: `A firewall was just created in ${taken}.` })
				return
			}

			const resp = await api.invoke('waf.set', {
				project,
				location: target,
				description,
				rules: (src.rules ?? []).map((r) => ({ ...r, id: '' })),
				limits: (src.limits ?? []).map((l) => ({ ...l, id: '' }))
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}

			isActive = false
			await api.invalidate('waf.list')
			modal.success({ content: `Firewall copied to ${target}. It is now deploying.` })
		} finally {
			submitting = false
		}
	}
</script>

<div class="modal" onclick={close} class:is-active={isActive} aria-hidden={!isActive}>
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="modal-panel" onclick={(e) => e.stopPropagation()}>
		<div class="modal-close" onclick={close} onkeypress={close} tabindex="0" role="button">✕</div>
		<h4><strong>Copy firewall</strong></h4>

		{#if loading}
			<p class="mt-4">Loading…</p>
		{:else if sourceZone}
			{#if eligible.length === 0}
				<p class="mt-4">
					Every WAF-capable location already has a firewall. Disable an
					existing firewall first to copy over it.
				</p>
				<div class="actions mt-6">
					<button class="button is-variant-tertiary" onclick={close}>Close</button>
				</div>
			{:else}
				<p class="mt-4">
					Copies
					<strong>{sourceZone.rules?.length ?? 0} {(sourceZone.rules?.length ?? 0) === 1 ? 'rule' : 'rules'}</strong>
					and
					<strong>{sourceZone.limits?.length ?? 0} {(sourceZone.limits?.length ?? 0) === 1 ? 'rate limit' : 'rate limits'}</strong>
					from <span class="font-mono">{source}</span>.
				</p>
				<p class="hint mt-2">
					The copy starts with fresh metric series — match history stays with
					the source zone.
				</p>

				<div class="field mt-4">
					<label for="copy-target-location">Target location</label>
					<Select
						id="copy-target-location"
						bind:value={target}
						required
						placeholder="Select Location"
						options={eligible.map((loc) => ({ value: loc.id, label: loc.id }))} />
				</div>

				<div class="field mt-4">
					<label for="copy-description">Description</label>
					<div class="input">
						<input id="copy-description" bind:value={description} placeholder="Optional description">
					</div>
				</div>

				<div class="actions mt-6">
					<button class="button is-variant-tertiary" onclick={close} disabled={submitting}>Cancel</button>
					<button class="button" class:is-loading={submitting}
						onclick={copy} disabled={!target || submitting}>
						Copy firewall
					</button>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.modal-panel {
		width: 100%;
		max-width: 32rem;
	}

	.hint {
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content) / 0.55);
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
	}
</style>
