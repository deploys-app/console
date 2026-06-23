<script lang="ts" generics="T">
	import type { Snippet } from 'svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	// A column is either a plain header string, or an object that can opt the
	// column out of the mobile layout. `hideMobile` drops the column below the
	// table's 48rem breakpoint (see `.is-hide-mobile` in app.css) so wide list
	// pages shed low-value columns on phones while staying a real table; the row
	// snippet must put `class="is-hide-mobile"` on the matching <td> to keep the
	// header and body aligned.
	type Column = string | { label: string, hideMobile?: boolean }

	interface Props {
		title: string
		items: T[]
		// passed straight to ErrorRow, which renders an Api.Error, a thrown
		// Error, or a bare string — so it stays loosely typed here too.
		error?: any
		/** singular noun for the count line, e.g. 'disk' */
		noun: string
		/** plural override for irregular nouns (e.g. 'workload identities') */
		nounPlural?: string
		createPermission: string | string[]
		createHref: string
		createLabel?: string
		/** data column headers (the row snippet renders matching cells); use
		 *  `{ label, hideMobile: true }` to drop a column below 48rem */
		columns: Column[]
		/** append a right-aligned actions column header (+1 to the empty/error span) */
		actions?: boolean
		key: (item: T) => string | number
		/** renders the `<td>` cells for one row */
		row: Snippet<[T]>
	}

	const {
		title, items, error, noun, nounPlural,
		createPermission, createHref, createLabel = 'Create',
		columns, actions = false, key, row
	}: Props = $props()

	const plural = $derived(nounPlural ?? `${noun}s`)
	const span = $derived(columns.length + (actions ? 1 : 0))

	const colLabel = (c: Column) => typeof c === 'string' ? c : c.label
	const colHidden = (c: Column) => typeof c !== 'string' && !!c.hideMobile
</script>

<div class="page-head">
	<div>
		<h4><strong>{title}</strong></h4>
		<p class="page-sub">{items.length} {items.length === 1 ? noun : plural}</p>
	</div>
	<GuardedButton permission={createPermission} class="button is-icon-left" href={createHref}>
		<i class="fa-solid fa-plus"></i>
		{createLabel}
	</GuardedButton>
</div>
<div class="panel is-level-300">
	<div class="table-container">
		<table class="table is-variant-compact">
			<thead>
				<tr>
					{#each columns as col (colLabel(col))}<th class:is-hide-mobile={colHidden(col)}>{colLabel(col)}</th>{/each}
					{#if actions}<th class="is-collapse is-align-right"></th>{/if}
				</tr>
			</thead>
			<tbody>
				{#each items as item (key(item))}
					<tr>{@render row(item)}</tr>
				{/each}
				<NoDataRow {span} list={items} {error} />
				<ErrorRow {span} {error} />
			</tbody>
		</table>
	</div>
</div>
