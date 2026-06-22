<script lang="ts">
	import { STATUS_FILTERS, SORT_OPTIONS } from './format'

	interface Props {
		status: Api.ErrorStatusFilter
		sort: Api.ErrorSort
		query: string
		// Count summary shown next to the brand; null/undefined hides it (e.g. while
		// loading or in a terminal state).
		count?: string | null
		brand?: string
		// Manual re-fetch. While `refreshing` is true the icon spins and the button
		// is disabled.
		onRefresh?: () => void
		refreshing?: boolean
	}

	let {
		status = $bindable(),
		sort = $bindable(),
		query = $bindable(),
		count = null,
		brand = 'Errors',
		onRefresh,
		refreshing = false
	}: Props = $props()
</script>

<header class="errors-rail">
	<h6 class="errors-rail__brand">{brand}</h6>
	{#if count != null}
		<span class="errors-rail__count">{count}</span>
	{/if}

	<span class="errors-rail__spacer"></span>

	<div class="filter-pills" role="group" aria-label="Status filter">
		{#each STATUS_FILTERS as f (f.value)}
			<button
				type="button"
				class="filter-pill"
				aria-pressed={status === f.value}
				data-active={status === f.value}
				onclick={() => (status = f.value)}>
				{f.label}
			</button>
		{/each}
	</div>

	<label class="sort-control">
		<span class="sort-control__label">Sort</span>
		<span class="sort-control__field">
			<select class="sort-control__select" bind:value={sort} aria-label="Sort issues by">
				{#each SORT_OPTIONS as o (o.value)}
					<option value={o.value}>{o.label}</option>
				{/each}
			</select>
			<i class="fa-solid fa-chevron-down sort-control__chevron" aria-hidden="true"></i>
		</span>
	</label>

	<label class="filter-search">
		<i class="fa-solid fa-magnifying-glass filter-search__icon" aria-hidden="true"></i>
		<input
			class="filter-search__input"
			type="text"
			placeholder="Filter issues…"
			aria-label="Filter issues"
			spellcheck="false"
			autocomplete="off"
			bind:value={query} />
		{#if query}
			<button type="button" class="filter-search__clear" onclick={() => (query = '')} aria-label="Clear filter">
				<i class="fa-solid fa-xmark"></i>
			</button>
		{/if}
	</label>

	{#if onRefresh}
		<button
			type="button"
			class="rail-refresh"
			onclick={() => onRefresh?.()}
			disabled={refreshing}
			aria-label="Refresh errors">
			<i class="fa-solid fa-arrows-rotate" class:fa-spin={refreshing} aria-hidden="true"></i>
		</button>
	{/if}
</header>

<style>
	/* --shell-divider is set on the .errors-shell that wraps this rail; the custom
	   property inherits down, with a fallback if the rail is used standalone. */
	.errors-rail {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.6rem 1rem;
		border-bottom: 1px solid var(--shell-divider, hsl(var(--hsl-content) / 0.08));
		background: linear-gradient(180deg,
			hsl(var(--hsl-base-200)) 0%,
			hsl(var(--hsl-base-100)) 100%);
		box-shadow: inset 0 1px 0 hsl(var(--hsl-content) / 0.04);
		font-family: var(--ffml-primary);
		flex-wrap: wrap;
	}

	.errors-rail__brand {
		margin: 0;
		font-weight: 600;
		color: hsl(var(--hsl-content));
		font-size: 0.9rem;
	}

	.errors-rail__count {
		color: hsl(var(--hsl-content) / 0.5);
		font-size: 0.8125rem;
		font-variant-numeric: tabular-nums;
	}

	.errors-rail__spacer { flex: 1; }

	/* status filter pills */
	.filter-pills {
		display: inline-flex;
		background: hsl(var(--hsl-content) / 0.05);
		border: 1px solid hsl(var(--hsl-content) / 0.08);
		border-radius: 7px;
		padding: 2px;
		gap: 2px;
	}

	.filter-pill {
		border: none;
		background: transparent;
		border-radius: 5px;
		padding: 0 0.65rem;
		height: 1.6rem;
		font-family: var(--ffml-primary);
		font-size: 0.8125rem;
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.55);
		cursor: pointer;
		transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
	}
	.filter-pill:hover { color: hsl(var(--hsl-content) / 0.85); }
	.filter-pill[data-active='true'] {
		background: hsl(var(--hsl-base-100));
		color: hsl(var(--hsl-content));
		box-shadow: 0 1px 2px hsl(var(--hsl-content) / 0.1);
	}

	/* Compact rail search, matching the Logs rail's .log-filter — the .input
	   component class can't be used here (its min-height: 2.5rem towers over the
	   ~1.85rem status pills next to it). */
	.filter-search {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		height: 1.85rem;
		padding: 0 0.55rem;
		background: hsl(var(--hsl-content) / 0.04);
		border: 1px solid hsl(var(--hsl-content) / 0.08);
		border-radius: 6px;
		transition: border-color 0.15s ease, background 0.15s ease;
	}
	.filter-search:focus-within {
		border-color: hsl(var(--hsl-primary) / 0.5);
		background: hsl(var(--hsl-base-100));
		box-shadow: 0 0 0 3px hsl(var(--hsl-primary) / 0.08);
	}
	.filter-search__icon { font-size: 0.625rem; color: hsl(var(--hsl-content) / 0.4); }
	.filter-search__input {
		background: transparent;
		border: none;
		outline: none;
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content));
		width: 11rem;
	}
	.filter-search__input::placeholder { color: hsl(var(--hsl-content) / 0.4); letter-spacing: 0.02em; }
	.filter-search__clear {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		background: transparent;
		border: none;
		border-radius: 4px;
		padding: 0;
		color: hsl(var(--hsl-content) / 0.4);
		cursor: pointer;
		font-size: 0.7rem;
		line-height: 1;
	}
	/* Extend the hit target to ~44px (WCAG) without growing the compact rail —
	   the icon stays small, the clickable area spills invisibly around it. */
	.filter-search__clear::after {
		content: '';
		position: absolute;
		inset: -0.75rem;
	}
	.filter-search__clear:hover { color: hsl(var(--hsl-content)); }

	/* sort selector — compact native select sized to sit in the rail next to the
	   status pills (the .select component class is too tall, like .input). */
	.sort-control {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}
	.sort-control__label {
		font-size: 0.75rem;
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.5);
	}
	.sort-control__field {
		position: relative;
		display: inline-flex;
		align-items: center;
	}
	.sort-control__select {
		appearance: none;
		-webkit-appearance: none;
		height: 1.85rem;
		padding: 0 1.6rem 0 0.55rem;
		background: hsl(var(--hsl-content) / 0.04);
		border: 1px solid hsl(var(--hsl-content) / 0.08);
		border-radius: 6px;
		font-family: var(--ffml-primary);
		font-size: 0.8125rem;
		font-weight: 600;
		color: hsl(var(--hsl-content));
		cursor: pointer;
		transition: border-color 0.15s ease, background 0.15s ease;
	}
	.sort-control__select:hover { background: hsl(var(--hsl-content) / 0.07); }
	.sort-control__select:focus-visible {
		outline: none;
		border-color: hsl(var(--hsl-primary) / 0.5);
		background: hsl(var(--hsl-base-100));
		box-shadow: 0 0 0 3px hsl(var(--hsl-primary) / 0.08);
	}
	.sort-control__chevron {
		position: absolute;
		right: 0.55rem;
		font-size: 0.625rem;
		color: hsl(var(--hsl-content) / 0.4);
		pointer-events: none;
	}

	/* manual refresh — compact icon button matching the rail controls' height */
	.rail-refresh {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.85rem;
		height: 1.85rem;
		background: hsl(var(--hsl-content) / 0.04);
		border: 1px solid hsl(var(--hsl-content) / 0.08);
		border-radius: 6px;
		color: hsl(var(--hsl-content) / 0.55);
		font-size: 0.75rem;
		cursor: pointer;
		transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
	}
	.rail-refresh:hover:not(:disabled) {
		background: hsl(var(--hsl-content) / 0.07);
		color: hsl(var(--hsl-content) / 0.85);
	}
	.rail-refresh:focus-visible {
		outline: none;
		border-color: hsl(var(--hsl-primary) / 0.5);
		box-shadow: 0 0 0 3px hsl(var(--hsl-primary) / 0.08);
	}
	.rail-refresh:disabled { cursor: default; color: hsl(var(--hsl-content) / 0.4); }
</style>
