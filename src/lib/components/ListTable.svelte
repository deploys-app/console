<script lang="ts" generics="T">
	import type { Snippet } from 'svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import { getPermissionContext } from '$lib/permission'
	import { registerPageActions } from '$lib/pageactions/store.svelte'

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
		/** data column headers (the row snippet renders matching cells) */
		columns: string[]
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

	// Surface the create button as a command-palette action, mirroring its
	// permission gate. ListTable can mount outside the (project) layout (billing /
	// project list) where no permission context is set — guard and register
	// nothing there. Registered as its own set, so it stacks after any actions a
	// detail Header on the same page already contributed.
	const ctx = getPermissionContext()
	$effect(() => {
		if (!ctx || !createHref) return
		const required = Array.isArray(createPermission) ? createPermission : [createPermission]
		if (!required.every((p) => ctx.can(p))) return
		return registerPageActions([{
			id: `list-create:${createHref}`,
			label: createLabel,
			icon: 'fa-plus',
			keywords: 'create new add',
			href: createHref
		}])
	})
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
					{#each columns as col (col)}<th>{col}</th>{/each}
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
