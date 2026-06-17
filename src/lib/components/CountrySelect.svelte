<script lang="ts">
	import OptionSelect from '$lib/components/OptionSelect.svelte'
	import { countries, countryLabel } from '$lib/waf/countries'

	/**
	 * Searchable country picker — a thin wrapper over {@link OptionSelect}. The
	 * dropdown lists every country as `"CODE — Name"`, filterable by either the
	 * ISO code or the name; the value stored is always the bare ISO alpha-2 code.
	 *
	 * Single mode binds `value` (one code). Multi mode binds `tags` (an array of
	 * codes) and renders the chosen countries as chips.
	 */
	interface Props {
		/** multi-select (chips) vs single value */
		multi?: boolean
		/** single mode — selected code */
		value?: string
		/** multi mode — selected codes */
		tags?: string[]
		/** id for the inner input (label association) */
		id?: string
		placeholder?: string
	}

	let {
		multi = false,
		value = $bindable(''),
		tags = $bindable([]),
		id,
		placeholder = 'Search country or code'
	}: Props = $props()

	// Code in mono (`code`), name as the row text (`name`), and "CODE — Name" as
	// the resting/chip label — matching the prior bespoke rendering.
	const options = countries.map((c) => ({
		value: c.code,
		label: countryLabel(c.code),
		code: c.code,
		name: c.name
	}))
</script>

<OptionSelect
	{options}
	{multi}
	bind:value
	bind:tags
	{id}
	{placeholder}
	emptyText="No matching country" />
