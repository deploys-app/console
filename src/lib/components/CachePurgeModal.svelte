<script lang="ts">
	import Select from '$lib/components/Select.svelte'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	/**
	 * Purge edge-cached content for one of the project's domains. The edge cache
	 * keys on the request host, so a purge is addressed by domain (+ optional
	 * path), exactly like the domain detail page's purge controls — this modal
	 * just brings the same capability to the cache hub and lets the user pick any
	 * domain in one place. Domains are loaded lazily on open() (most cache-page
	 * visitors never purge), so the page loader stays untouched and a forbidden
	 * domain.list never breaks the page.
	 *
	 * Backed by the domain.purgeCache RPC ({ project, domain, file?, prefix? }):
	 * no field → purge everything, prefix → purge a path prefix, file → purge one
	 * exact path.
	 */

	interface Props {
		project: string
	}

	const { project }: Props = $props()

	type Scope = 'everything' | 'prefix' | 'file'

	let isActive = $state(false)
	let loading = $state(false)
	let submitting = $state(false)
	let domains = $state<Api.Domain[]>([])
	let loadError = $state<Api.Error | undefined>()

	let domain = $state('')
	let scope = $state<Scope>('everything')
	let path = $state('')

	// Wildcard domains can't be purged — the edge purge targets an exact host —
	// so only non-wildcard domains are selectable, matching the domain detail
	// page, which disables purge for wildcards.
	const purgeable = $derived(domains.filter((d) => !d.wildcard))
	const options = $derived(purgeable.map((d) => ({ value: d.domain, label: d.domain })))

	const needsPath = $derived(scope !== 'everything')
	const canPurge = $derived(!!domain && (!needsPath || path.trim() !== ''))

	export async function open (): Promise<void> {
		isActive = true
		submitting = false
		scope = 'everything'
		path = ''
		domain = ''
		loadError = undefined
		domains = []
		loading = true

		const resp = await api.invoke<Api.List<Api.Domain>>('domain.list', { project }, fetch)
		loading = false
		if (!resp.ok) {
			loadError = resp.error
			return
		}
		domains = resp.result?.items ?? []
		// Preselect the first purgeable domain so "Purge everything" is one click.
		domain = purgeable[0]?.domain ?? ''
	}

	function close () {
		if (submitting) return
		isActive = false
	}

	function selectScope (s: Scope) {
		scope = s
		if (s === 'everything') path = ''
	}

	async function purge () {
		if (!canPurge || submitting) return

		const args: { project: string, domain: string, file?: string, prefix?: string } = { project, domain }
		const trimmed = path.trim()
		if (scope === 'prefix') args.prefix = trimmed
		if (scope === 'file') args.file = trimmed

		submitting = true
		try {
			const resp = await api.invoke('domain.purgeCache', args, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			isActive = false
			const what = scope === 'everything'
				? 'all cached content'
				: scope === 'prefix'
					? `path prefix "${trimmed}"`
					: `exact path "${trimmed}"`
			modal.success({ content: `Purged ${what} on "${domain}".` })
		} finally {
			submitting = false
		}
	}
</script>

<div class="modal" onclick={close} class:is-active={isActive} aria-hidden={!isActive}>
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="modal-panel" onclick={(e) => e.stopPropagation()}>
		<div class="modal-close" onclick={close} onkeypress={close} tabindex="0" role="button">✕</div>
		<h4><strong>Purge cache</strong></h4>
		<p class="page-sub mt-1">
			Drop edge-cached content so the next request refetches from origin. Purges
			are immediate and global across all locations.
		</p>

		{#if loading}
			<div class="state"><i class="fa-solid fa-spinner-third fa-spin"></i></div>
		{:else if loadError}
			<div class="state is-error">Couldn't load domains. Close and try again.</div>
		{:else if purgeable.length === 0}
			<div class="state">
				No purgeable domains. Add a custom domain to this project first —
				wildcard domains can't be purged.
				<a class="link" href={`/domain?project=${project}`}>Manage domains</a>
			</div>
		{:else}
			<div class="field mt-4">
				<label for="purge-domain">Domain</label>
				<Select id="purge-domain" bind:value={domain} {options} placeholder="Select domain" required />
			</div>

			<div class="field mt-4">
				<span class="label">Scope</span>
				<div class="seg" role="group" aria-label="Purge scope">
					<button type="button" class="seg-btn" class:is-active={scope === 'everything'}
						aria-pressed={scope === 'everything'} onclick={() => selectScope('everything')}>Everything</button>
					<button type="button" class="seg-btn" class:is-active={scope === 'prefix'}
						aria-pressed={scope === 'prefix'} onclick={() => selectScope('prefix')}>Path prefix</button>
					<button type="button" class="seg-btn" class:is-active={scope === 'file'}
						aria-pressed={scope === 'file'} onclick={() => selectScope('file')}>Exact path</button>
				</div>
			</div>

			{#if needsPath}
				<div class="field mt-4">
					<label for="purge-path">{scope === 'prefix' ? 'Path prefix' : 'Exact path'}</label>
					<div class="input">
						<input id="purge-path" bind:value={path}
							placeholder={scope === 'prefix' ? '/static/' : '/static/app.js'}
							onkeydown={(e) => { if (e.key === 'Enter' && canPurge) purge() }}>
					</div>
					<p class="hint">
						{scope === 'prefix'
							? 'Every cached path that starts with this prefix is dropped.'
							: 'Only this exact cached path is dropped.'}
					</p>
				</div>
			{/if}

			<div class="actions mt-6">
				<button class="button is-variant-tertiary" onclick={close} disabled={submitting}>Cancel</button>
				<button class="button is-variant-negative" class:is-loading={submitting}
					onclick={purge} disabled={!canPurge || submitting}>Purge</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.modal-panel {
		width: 100%;
		max-width: 32rem;
	}

	.state {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		min-height: 6rem;
		margin-top: 1rem;
		color: hsl(var(--hsl-content) / 0.6);
		font-size: 0.875rem;
	}

	.state.is-error {
		color: hsl(var(--hsl-negative) / 0.85);
	}

	.hint {
		margin-top: 0.375rem;
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content) / 0.55);
	}

	/* Segmented scope toggle — mirrors the cache page's Requests|Bandwidth seg. */
	.seg {
		display: inline-flex;
		padding: 0.1875rem;
		gap: 0.125rem;
		border-radius: 0.625rem;
		background: hsl(var(--hsl-base-200));
		border: 1px solid hsl(var(--hsl-line) / 0.7);
	}

	.seg-btn {
		padding: 0.3125rem 0.6875rem;
		border-radius: 0.4375rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.6);
		transition: color var(--timing-fastest) ease, background var(--timing-fastest) ease;
	}

	.seg-btn:hover {
		color: hsl(var(--hsl-content) / 0.9);
	}

	.seg-btn.is-active {
		color: hsl(var(--hsl-primary-content));
		background: hsl(var(--hsl-primary));
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
	}
</style>
