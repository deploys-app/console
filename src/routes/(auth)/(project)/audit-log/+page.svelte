<script>
	import { untrack } from 'svelte'
	import { SvelteURLSearchParams } from 'svelte/reactivity'
	import { goto } from '$app/navigation'
	import { DatePicker } from '@svelte-plugins/datepicker'
	import dayjs from 'dayjs'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import OutcomeBadge from '$lib/components/OutcomeBadge.svelte'
	import Select from '$lib/components/Select.svelte'
	import * as format from '$lib/format'

	const { data } = $props()

	const project = $derived(data.project)
	const items = $derived(data.items)
	const error = $derived(data.error)

	const RESOURCE_TYPES = [
		{ value: 'deployment', label: 'Deployment' },
		{ value: 'disk', label: 'Disk' },
		{ value: 'domain', label: 'Domain' },
		{ value: 'envGroup', label: 'Env Group' },
		{ value: 'pullSecret', label: 'Pull Secret' },
		{ value: 'role', label: 'Role' },
		{ value: 'serviceAccount', label: 'Service Account' }
	]

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
		startDate: parseDate(data.filters.after),
		endDate: parseDate(data.filters.before)
	})))

	let isDatePickerOpen = $state(false)
	let applying = $state(false)

	const dateRangeLabel = $derived.by(() => {
		const s = form.startDate ? dayjs(form.startDate).format('YYYY-MM-DD') : ''
		const e = form.endDate ? dayjs(form.endDate).format('YYYY-MM-DD') : ''
		if (!s && !e) return ''
		return `${s || '…'}  →  ${e || '…'}`
	})

	function toggleDatePicker () {
		isDatePickerOpen = !isDatePickerOpen
	}

	function clearDateRange (e) {
		e.stopPropagation()
		form.startDate = null
		form.endDate = null
	}

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
			if (form.startDate) q.set('after', new Date(form.startDate).toISOString())
			if (form.endDate) q.set('before', new Date(form.endDate).toISOString())
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
			form.startDate = null
			form.endDate = null
			await goto(`/audit-log?project=${project}`, { keepFocus: true })
		} finally {
			applying = false
		}
	}

</script>

<style>
	.filter-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}

	@media (max-width: 768px) {
		.filter-row {
			grid-template-columns: 1fr;
		}
	}

	.actor-row {
		margin-top: 1rem;
	}

	.filter-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.date-range-trigger {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		width: 100%;
		min-height: var(--form-element-height, 2.25rem);
		padding: 0 0.625rem;
		border: 1px solid hsl(var(--hsl-content) / 0.15);
		border-radius: var(--form-element-border-radius, 0.25rem);
		background: transparent;
		color: hsl(var(--hsl-content));
		font: inherit;
		text-align: left;
		cursor: pointer;
		transition: border-color 0.16s ease-in-out, box-shadow 0.16s ease-in-out;
	}

	.date-range-trigger:hover {
		border-color: hsl(var(--hsl-content) / 0.25);
	}

	.date-range-trigger:focus-visible {
		outline: none;
		border-color: hsl(var(--hsl-primary));
		box-shadow: 0 0 0 0.175rem hsl(var(--hsl-primary) / 0.3);
	}

	.date-range-trigger .placeholder {
		color: hsl(var(--hsl-content) / 0.5);
	}

	.date-range-trigger .value {
		flex: 1;
	}

	.date-range-trigger .icon-clear {
		display: inline-flex;
		padding: 0.2rem;
		border-radius: 4px;
		color: hsl(var(--hsl-content) / 0.6);
		background: transparent;
		border: 0;
		cursor: pointer;
	}

	.date-range-trigger .icon-clear:hover {
		color: hsl(var(--hsl-content));
		background: hsl(var(--hsl-content) / 0.08);
	}

	.date-range-trigger .icon-cal {
		color: hsl(var(--hsl-content) / 0.5);
	}

	:global(.datepicker[data-picker-theme='audit-log-dp']) {
		--range-tint: hsl(var(--hsl-primary) / 0.22);

		--datepicker-container-background: hsl(var(--hsl-base-200));
		--datepicker-container-border: 1px solid hsl(var(--hsl-content) / 0.2);
		--datepicker-color: hsl(var(--hsl-content));
		--datepicker-border-color: hsl(var(--hsl-content) / 0.15);
		--datepicker-state-active: hsl(var(--hsl-primary));
		--datepicker-state-hover: hsl(var(--hsl-content) / 0.1);

		--datepicker-calendar-header-color: hsl(var(--hsl-content));
		--datepicker-calendar-header-text-color: hsl(var(--hsl-content));
		--datepicker-calendar-header-month-nav-color: hsl(var(--hsl-content));
		--datepicker-calendar-header-month-nav-background-hover: hsl(var(--hsl-content) / 0.1);
		--datepicker-calendar-header-month-nav-icon-next-filter: invert(1);
		--datepicker-calendar-header-month-nav-icon-prev-filter: invert(1);
		--datepicker-calendar-header-year-nav-icon-next-filter: invert(1);
		--datepicker-calendar-header-year-nav-icon-prev-filter: invert(1);

		--datepicker-calendar-dow-color: hsl(var(--hsl-content) / 0.65);
		--datepicker-calendar-day-color: hsl(var(--hsl-content));
		--datepicker-calendar-day-color-hover: hsl(var(--hsl-content));
		--datepicker-calendar-day-background-hover: hsl(var(--hsl-content) / 0.1);
		--datepicker-calendar-day-color-disabled: hsl(var(--hsl-content) / 0.35);
		--datepicker-calendar-day-other-color: hsl(var(--hsl-content) / 0.35);

		--datepicker-calendar-today-border: 1px solid hsl(var(--hsl-primary));
		--datepicker-calendar-today-background: transparent;

		--datepicker-calendar-range-color: hsl(var(--hsl-content));
		--datepicker-calendar-range-background: var(--range-tint);
		--datepicker-calendar-range-background-disabled: var(--range-tint);

		--datepicker-calendar-range-included-background: var(--range-tint);
		--datepicker-calendar-range-included-color: hsl(var(--hsl-content));
		--datepicker-calendar-range-included-box-shadow: inset 20px 0 0 var(--range-tint);

		--datepicker-calendar-range-start-box-shadow: inset -20px 0 0 var(--range-tint);
		--datepicker-calendar-range-end-box-shadow: inset 20px 0 0 var(--range-tint);
		--datepicker-calendar-range-start-box-shadow-selected: inset -20px 0 0 var(--range-tint);
		--datepicker-calendar-range-end-box-shadow-selected: inset 20px 0 0 var(--range-tint);

		--datepicker-calendar-range-selected-background: hsl(var(--hsl-primary));
		--datepicker-calendar-range-selected-color: hsl(var(--hsl-primary-content));
		--datepicker-calendar-range-start-end-background: var(--range-tint);
		--datepicker-calendar-range-start-end-color: hsl(var(--hsl-content));

		--datepicker-calendar-split-border: 1px solid hsl(var(--hsl-content) / 0.12);

		--datepicker-presets-border: 1px solid hsl(var(--hsl-content) / 0.12);
		--datepicker-presets-button-color: hsl(var(--hsl-content));
		--datepicker-presets-button-color-hover: hsl(var(--hsl-content));
		--datepicker-presets-button-color-focus: hsl(var(--hsl-content));
		--datepicker-presets-button-color-active: hsl(var(--hsl-primary-content));
		--datepicker-presets-button-background: transparent;
		--datepicker-presets-button-background-hover: hsl(var(--hsl-content) / 0.1);
		--datepicker-presets-button-background-active: hsl(var(--hsl-primary));
	}

	.action-cell {
		font-family: var(--font-family-mono, ui-monospace, monospace);
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content) / 0.85);
	}

	.resource-name {
		color: hsl(var(--hsl-content) / 0.65);
	}

	.resource-location {
		color: hsl(var(--hsl-content) / 0.55);
		font-size: 0.8125rem;
		margin-left: 0.25rem;
	}

	.detail-text {
		color: hsl(var(--hsl-content) / 0.75);
	}

	.actor-tag {
		display: inline-block;
		margin-left: 0.25rem;
		padding: 0.05rem 0.4rem;
		border-radius: 4px;
		font-size: 0.75rem;
		background: hsl(var(--hsl-content) / 0.08);
		color: hsl(var(--hsl-content) / 0.7);
		vertical-align: middle;
	}
</style>

<div class="page-head">
	<div>
		<h4><strong>Audit Logs</strong></h4>
		<p class="page-sub">{items.length} {items.length === 1 ? 'event' : 'events'}</p>
	</div>
</div>
<div class="panel is-level-300">
	<form onsubmit={apply}>
		<div class="filter-row">
			<div class="field">
				<label class="label" for="filter-resource-type">Resource type</label>
				<Select
					id="filter-resource-type"
					bind:value={form.resourceType}
					options={[{ value: '', label: 'All' }, ...RESOURCE_TYPES.map((t) => ({ value: t.value, label: t.label }))]} />
			</div>
			<div class="field">
				<label class="label" for="filter-outcome">Outcome</label>
				<Select
					id="filter-outcome"
					bind:value={form.outcome}
					options={[
						{ value: '', label: 'All' },
						{ value: 'success', label: 'Success' },
						{ value: 'failure', label: 'Failure' }
					]} />
			</div>
			<div class="field">
				<span class="label">Date range</span>
				<DatePicker
					theme="audit-log-dp"
					bind:isOpen={isDatePickerOpen}
					bind:startDate={form.startDate}
					bind:endDate={form.endDate}
					isRange
					isMultipane
					showPresets
					align="right"
					includeFont={false}
				>
					<button type="button" class="date-range-trigger" onclick={toggleDatePicker}>
						<i class="fa-regular fa-calendar icon-cal"></i>
						{#if dateRangeLabel}
							<span class="value">{dateRangeLabel}</span>
							<span class="icon-clear" role="button" tabindex="-1"
								aria-label="Clear date range"
								onclick={clearDateRange}
								onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && clearDateRange(e)}>
								<i class="fa-solid fa-xmark"></i>
							</span>
						{:else}
							<span class="placeholder value">Any time</span>
						{/if}
					</button>
				</DatePicker>
			</div>
		</div>
		<div class="actor-row">
			<div class="field">
				<label class="label" for="filter-actor">Actor</label>
				<div class="input">
					<input id="filter-actor" type="text" placeholder="email or service account"
						bind:value={form.actor}>
				</div>
			</div>
		</div>

		<div class="filter-actions">
			<button type="button" class="button is-variant-secondary"
				onclick={reset} disabled={applying}>Reset</button>
			<button type="submit" class="button" class:is-loading={applying}>Apply</button>
		</div>
	</form>

	<div class="table-container mt-4">
		<table class="table is-variant-compact">
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
					<tr>
						<td>{format.datetime(it.createdAt)}</td>
						<td><OutcomeBadge outcome={it.outcome} /></td>
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
