<script>
	import { untrack } from 'svelte'
	import { SvelteURLSearchParams } from 'svelte/reactivity'
	import { goto } from '$app/navigation'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import * as format from '$lib/format'

	const { data } = $props()

	const project = $derived(data.project)
	const items = $derived(data.items)
	const error = $derived(data.error)

	const form = $state(untrack(() => ({ ...data.filters })))

	let applying = $state(false)

	/**
	 * @param {Event} e
	 */
	async function apply (e) {
		e.preventDefault()
		if (applying) return
		applying = true
		try {
			const q = new SvelteURLSearchParams()
			q.set('project', project)
			if (form.resourceType) q.set('resourceType', form.resourceType)
			if (form.actor) q.set('actor', form.actor)
			if (form.outcome) q.set('outcome', form.outcome)
			if (form.after) q.set('after', form.after)
			if (form.before) q.set('before', form.before)
			if (form.limit && form.limit !== 50) q.set('limit', String(form.limit))
			await goto(`/audit-log?${q.toString()}`, { keepFocus: true })
		} finally {
			applying = false
		}
	}

	async function reset () {
		if (applying) return
		applying = true
		try {
			form.resourceType = ''
			form.actor = ''
			form.outcome = ''
			form.after = ''
			form.before = ''
			form.limit = 50
			await goto(`/audit-log?project=${project}`, { keepFocus: true })
		} finally {
			applying = false
		}
	}

	/**
	 * @param {Api.AuditOutcome} o
	 */
	function outcomeBadge (o) {
		if (o === 'success') return { icon: 'fa-circle-check', cls: 'is-positive', label: 'Success' }
		if (o === 'failure') return { icon: 'fa-circle-xmark', cls: 'is-negative', label: 'Failure' }
		return { icon: 'fa-circle', cls: '', label: o }
	}
</script>

<style lang="scss">
	.filter-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1rem;
	}

	.filter-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.outcome-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.15rem 0.55rem;
		border-radius: 999px;
		font-size: 0.8125rem;
		line-height: 1.25;
		background: hsl(var(--hsl-content)/0.08);

		&.is-positive {
			color: hsl(var(--hsl-positive));
			background: hsl(var(--hsl-positive)/0.12);
		}

		&.is-negative {
			color: hsl(var(--hsl-negative));
			background: hsl(var(--hsl-negative)/0.12);
		}
	}

	.action-cell {
		font-family: var(--font-family-mono, ui-monospace, monospace);
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content)/0.85);
	}

	.resource-name {
		color: hsl(var(--hsl-content)/0.65);
	}

	.resource-location {
		color: hsl(var(--hsl-content)/0.55);
		font-size: 0.8125rem;
		margin-left: 0.25rem;
	}

	.detail-text {
		color: hsl(var(--hsl-content)/0.75);
	}

	.actor-tag {
		display: inline-block;
		margin-left: 0.25rem;
		padding: 0.05rem 0.4rem;
		border-radius: 4px;
		font-size: 0.7rem;
		background: hsl(var(--hsl-content)/0.08);
		color: hsl(var(--hsl-content)/0.7);
		vertical-align: middle;
	}
</style>

<h6>Audit Logs</h6>
<br>
<div class="nm-panel is-level-300">
	<form onsubmit={apply}>
		<div class="filter-grid">
			<div class="nm-field">
				<label class="nm-label" for="filter-resource-type">Resource type</label>
				<div class="nm-input">
					<input id="filter-resource-type" type="text" placeholder="e.g. deployment"
						bind:value={form.resourceType}>
				</div>
			</div>
			<div class="nm-field">
				<label class="nm-label" for="filter-actor">Actor</label>
				<div class="nm-input">
					<input id="filter-actor" type="text" placeholder="email or service account"
						bind:value={form.actor}>
				</div>
			</div>
			<div class="nm-field">
				<label class="nm-label" for="filter-outcome">Outcome</label>
				<div class="nm-select">
					<select id="filter-outcome" bind:value={form.outcome}>
						<option value="">All</option>
						<option value="success">Success</option>
						<option value="failure">Failure</option>
					</select>
				</div>
			</div>
			<div class="nm-field">
				<label class="nm-label" for="filter-after">After</label>
				<div class="nm-input">
					<input id="filter-after" type="datetime-local" bind:value={form.after}>
				</div>
			</div>
			<div class="nm-field">
				<label class="nm-label" for="filter-before">Before</label>
				<div class="nm-input">
					<input id="filter-before" type="datetime-local" bind:value={form.before}>
				</div>
			</div>
			<div class="nm-field">
				<label class="nm-label" for="filter-limit">Limit</label>
				<div class="nm-input">
					<input id="filter-limit" type="number" min="1" max="100"
						bind:value={form.limit}>
				</div>
			</div>
		</div>

		<div class="filter-actions">
			<button type="button" class="nm-button is-variant-secondary"
				onclick={reset} disabled={applying}>Reset</button>
			<button type="submit" class="nm-button" class:is-loading={applying}>Apply</button>
		</div>
	</form>

	<div class="nm-table-container _mgt-6">
		<table class="nm-table is-variant-compact">
			<thead>
				<tr>
					<th>Time</th>
					<th>Outcome</th>
					<th>Actor</th>
					<th>Action</th>
					<th>Resource</th>
					<th>Detail</th>
				</tr>
			</thead>
			<tbody>
				{#each items as it (it.id)}
					{@const o = outcomeBadge(it.outcome)}
					<tr>
						<td>{format.datetime(it.createdAt)}</td>
						<td>
							<span class="outcome-badge {o.cls}" title={o.label}>
								<i class="fa-solid {o.icon}"></i>
								{o.label}
							</span>
						</td>
						<td>
							{it.actor.email}
							{#if it.actor.type === 'ServiceAccount'}
								<span class="actor-tag">service account</span>
							{/if}
						</td>
						<td><span class="action-cell">{it.action}</span></td>
						<td>
							{#if it.resource.type}
								<strong>{it.resource.type}</strong>
								{#if it.resource.name}
									<span class="resource-name">/ {it.resource.name}</span>
								{/if}
								{#if it.resource.locationId}
									<span class="resource-location">@ {it.resource.locationId}</span>
								{/if}
							{/if}
						</td>
						<td>
							{#if it.detail}
								<span class="detail-text">{it.detail}</span>
							{/if}
						</td>
					</tr>
				{/each}
				<NoDataRow span={6} list={items} />
				<ErrorRow span={6} {error} />
			</tbody>
		</table>
	</div>
</div>
