<script>
	import { untrack } from 'svelte'
	import { SvelteURLSearchParams } from 'svelte/reactivity'
	import { goto } from '$app/navigation'
	import { DateInput } from 'date-picker-svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import * as format from '$lib/format'

	const { data } = $props()

	const project = $derived(data.project)
	const items = $derived(data.items)
	const error = $derived(data.error)

	const RESOURCE_TYPES = [
		{ value: 'deployment', label: 'Deployment' },
		{ value: 'disk', label: 'Disk' },
		{ value: 'domain', label: 'Domain' },
		{ value: 'pullSecret', label: 'Pull Secret' },
		{ value: 'role', label: 'Role' },
		{ value: 'serviceAccount', label: 'Service Account' }
	]
	const LIMIT_OPTIONS = [25, 50, 100]

	/**
	 * @param {string} v
	 * @returns {Date | null}
	 */
	function parseDate (v) {
		if (!v) return null
		const d = new Date(v)
		return isNaN(d.getTime()) ? null : d
	}

	const form = $state(untrack(() => ({
		resourceType: data.filters.resourceType,
		actor: data.filters.actor,
		outcome: data.filters.outcome,
		after: parseDate(data.filters.after),
		before: parseDate(data.filters.before),
		limit: data.filters.limit
	})))

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
			if (form.after) q.set('after', form.after.toISOString())
			if (form.before) q.set('before', form.before.toISOString())
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
			form.after = null
			form.before = null
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

	.date-field :global(.date-time-field) {
		width: 100%;
	}

	.date-field :global(.date-time-field input) {
		width: 100%;
		min-height: var(--form-element-height, 2.25rem);
		padding: 0 0.625rem;
		border: 1px solid hsl(var(--hsl-content)/0.15);
		border-radius: var(--form-element-border-radius, 0.25rem);
		background: transparent;
		color: hsl(var(--hsl-content));
		font: inherit;
		transition: border-color 0.16s ease-in-out, box-shadow 0.16s ease-in-out;

		&:hover {
			border-color: hsl(var(--hsl-content)/0.25);
		}

		&:focus {
			outline: none;
			border-color: hsl(var(--hsl-primary));
			box-shadow: 0 0 0 0.175rem hsl(var(--hsl-primary)/0.3);
		}
	}

	.date-field :global(.date-time-picker) {
		background: hsl(var(--hsl-base-200));
		color: hsl(var(--hsl-content));
		border: 1px solid hsl(var(--hsl-content)/0.15);
		--date-picker-background: hsl(var(--hsl-base-200));
		--date-picker-foreground: hsl(var(--hsl-content));
		--date-picker-highlight-border: hsl(var(--hsl-primary));
		--date-picker-highlight-shadow: hsl(var(--hsl-primary)/0.3);
		--date-picker-selected-color: hsl(var(--hsl-primary-content));
		--date-picker-selected-background: hsl(var(--hsl-primary));
	}
</style>

<h6>Audit Logs</h6>
<br>
<div class="nm-panel is-level-300">
	<form onsubmit={apply}>
		<div class="filter-grid">
			<div class="nm-field">
				<label class="nm-label" for="filter-resource-type">Resource type</label>
				<div class="nm-select">
					<select id="filter-resource-type" bind:value={form.resourceType}>
						<option value="">All</option>
						{#each RESOURCE_TYPES as t (t.value)}
							<option value={t.value}>{t.label}</option>
						{/each}
					</select>
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
			<div class="nm-field date-field">
				<label class="nm-label" for="filter-after">After</label>
				<DateInput id="filter-after" bind:value={form.after}
					format="yyyy-MM-dd HH:mm" placeholder="From" closeOnSelection={true} />
			</div>
			<div class="nm-field date-field">
				<label class="nm-label" for="filter-before">Before</label>
				<DateInput id="filter-before" bind:value={form.before}
					format="yyyy-MM-dd HH:mm" placeholder="To" closeOnSelection={true} />
			</div>
			<div class="nm-field">
				<label class="nm-label" for="filter-limit">Limit</label>
				<div class="nm-select">
					<select id="filter-limit" bind:value={form.limit}>
						{#each LIMIT_OPTIONS as n (n)}
							<option value={n}>{n}</option>
						{/each}
					</select>
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
