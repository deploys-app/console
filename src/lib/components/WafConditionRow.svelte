<script lang="ts">
	import Select from '$lib/components/Select.svelte'
	import TagInput from '$lib/components/TagInput.svelte'
	import CountrySelect from '$lib/components/CountrySelect.svelte'
	import OptionSelect from '$lib/components/OptionSelect.svelte'
	import {
		fields,
		getField,
		operatorsForField,
		isMultiOperator,
		parseList
	} from '$lib/waf/expression'
	import type { ExpressionSpec } from '$lib/waf/expression'

	interface Props {
		condition: ExpressionSpec // bindable structured condition
		onremove: () => void // remove this row
		removable?: boolean // show the remove button (default true)
	}

	let { condition = $bindable(), onremove, removable = true }: Props = $props()

	const fieldMeta = $derived(getField(condition.field))
	const fieldType = $derived(fieldMeta?.type ?? 'string')
	const needsName = $derived(!!fieldMeta?.hasName)
	const operators = $derived(operatorsForField(fieldMeta))
	const multi = $derived(isMultiOperator(condition.operator))
	const isTls = $derived(fieldType === 'tls')
	// A closed-set string field (the HTTP method) picks from its suggestions via a
	// dropdown rather than free text — single value as a combobox, list membership
	// as a multi-select (mirrors the country picker).
	const isMethod = $derived(fieldMeta?.value === 'method')
	const suggestionOptions = $derived((fieldMeta?.suggestions ?? []).map((s) => ({ value: s, label: s })))
	// Free-text combobox (datalist) for equals/not_equals on suggestion-backed fields.
	const useCombobox = $derived(
		!!fieldMeta?.suggestions &&
		(condition.operator === 'equals' || condition.operator === 'not_equals')
	)

	const fieldOptions = fields.map((f) => ({ value: f.value, label: f.label }))
	const operatorOptions = $derived(operators.map((o) => ({ value: o.value, label: o.label })))

	// `values` is the persisted contract (newline-joined text). The TagInput works
	// with an array of chips, so mirror the two — chips are the source of truth
	// while the row is mounted; writing back keeps `condition.values` in sync.
	let valuesList = $state(parseList(condition.values ?? ''))
	$effect(() => {
		const joined = valuesList.join('\n')
		if ((condition.values ?? '') !== joined) condition.values = joined
	})

	// Keep the operator valid when the field type changes (mirrors the old
	// builder): switching string→ip must not leave "contains any of" selected.
	$effect(() => {
		if (operators.length === 0) return
		const valid = operators.some((o) => o.value === condition.operator)
		if (!valid) condition.operator = operators[0]?.value ?? ''
	})

	// A value entered for one field rarely makes sense for another (an IP under a
	// numeric field, a country code under a path), so clear it when the user picks
	// a different field. Wired to the Select's onchange so it only fires on a real
	// user selection — programmatic reseeds (raw CEL → Visual) keep their values.
	function onFieldChange () {
		condition.value = ''
		condition.values = ''
		valuesList = []
	}
</script>

<div class="row">
	<div class="controls grid gap-3">
		<div class="grid gap-3 sm:grid-cols-2">
			<div class="field">
				<label for="waf-field">Field</label>
				<Select id="waf-field" bind:value={condition.field} options={fieldOptions} onchange={onFieldChange} />
			</div>

			{#if needsName}
				<div class="field">
					<label for="waf-name">Name</label>
					<div class="input">
						<input id="waf-name" bind:value={condition.name}
							placeholder={condition.field === 'header' ? 'e.g. user-agent' : condition.field === 'cookie' ? 'e.g. session' : 'e.g. token'}>
					</div>
				</div>
			{/if}
		</div>

		{#if isTls}
			<div class="field">
				<label class="checkbox" for="waf-tls">
					<input id="waf-tls" type="checkbox" checked={condition.tls !== false}
						onchange={(e) => (condition.tls = e.currentTarget.checked)}>
					<span>TLS</span>
				</label>
				<p class="helper">When on, the request must be served over HTTPS.</p>
			</div>
		{:else}
			<div class="grid gap-3 sm:grid-cols-2">
				<div class="field">
					<label for="waf-operator">Operator</label>
					<Select id="waf-operator" bind:value={condition.operator} options={operatorOptions} />
				</div>
			</div>

			{#if fieldType === 'country'}
				<div class="field">
					<label for="waf-value">{multi ? 'Countries' : 'Country'}</label>
					{#if multi}
						<CountrySelect multi bind:tags={valuesList} id="waf-value" />
					{:else}
						<CountrySelect bind:value={condition.value} id="waf-value" />
					{/if}
				</div>
			{:else if isMethod && multi}
				<div class="field">
					<label for="waf-values">Methods</label>
					<OptionSelect multi allowCustom options={suggestionOptions} bind:tags={valuesList}
						id="waf-values" placeholder="Select or type a method" emptyText="No matching method" />
					<p class="helper">Pick from the list or type a custom method (e.g. PURGE), then Enter.</p>
				</div>
			{:else if multi}
				<div class="field">
					<label for="waf-values">Values</label>
					<TagInput id="waf-values" bind:tags={valuesList}
						placeholder={fieldType === 'asn'
							? 'e.g. 13335, press Enter to add'
							: 'Type a value, press Enter to add'} />
				</div>
			{:else if useCombobox}
				<div class="field">
					<label for="waf-value">Value</label>
					<Select id="waf-value" editable bind:value={condition.value}
						options={(fieldMeta?.suggestions ?? []).map((s) => ({ value: s, label: s }))}
						placeholder="e.g. GET" />
				</div>
			{:else}
				<div class="field">
					<label for="waf-value">
						{#if fieldType === 'numeric' || fieldType === 'asn'}Number
						{:else if fieldType === 'ip' && condition.operator === 'in_cidr'}CIDR
						{:else if condition.operator === 'matches_regex'}Pattern
						{:else}Value{/if}
					</label>
					<div class="input">
						<input id="waf-value" class="font-mono" bind:value={condition.value}
							inputmode={fieldType === 'numeric' || fieldType === 'asn' ? 'numeric' : undefined}
							placeholder={fieldType === 'asn'
								? 'e.g. 13335'
								: fieldType === 'numeric'
									? 'e.g. 1048576'
									: fieldType === 'ip' && condition.operator === 'in_cidr'
										? 'e.g. 10.0.0.0/8'
										: condition.operator === 'matches_regex'
											? 'e.g. ^/api/v[0-9]+/'
											: condition.operator === 'starts_with' || condition.operator === 'not_starts_with'
												? 'e.g. /admin'
												: condition.operator === 'ends_with' || condition.operator === 'not_ends_with'
													? 'e.g. .php'
													: 'Value'}>
					</div>
				</div>
			{/if}
		{/if}
	</div>

	{#if removable}
		<button type="button" class="row-remove button is-variant-tertiary is-size-small"
			aria-label="Remove condition" onclick={onremove}>
			<i class="fa-solid fa-trash-can"></i>
		</button>
	{/if}
</div>

<style>
	.row {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: var(--radius-md);
		border: 1px solid hsl(var(--hsl-line));
		background-color: hsl(var(--hsl-base-400) / 0.12);
	}

	:root:not(.dark) .row {
		background-color: hsl(var(--hsl-base-100) / 0.6);
	}

	.controls {
		flex: 1;
		min-width: 0;
	}

	.row-remove {
		flex-shrink: 0;
		margin-top: 1.75rem;
	}
</style>
