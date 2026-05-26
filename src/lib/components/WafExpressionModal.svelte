<script>
	import Select from '$lib/components/Select.svelte'
	import {
		fields,
		getField,
		operatorsForType,
		isMultiOperator,
		buildExpression,
		combineExpression
	} from '$lib/waf/expression'

	/**
	 * @typedef {Object} Props
	 * @property {(expression: string) => void} [oninsert]
	 */

	/** @type {Props} */
	const { oninsert } = $props()

	let isActive = $state(false)
	// The expression already present on the rule we're editing. Drives the
	// "Combine with" choice (AND / OR / Replace) when non-empty.
	let existing = $state('')

	// --- builder spec (component-local form state) ---
	let field = $state('path')
	let name = $state('')
	let operator = $state('equals')
	let value = $state('')
	let values = $state('')
	let caseInsensitive = $state(false)
	let urlDecode = $state(false)
	let negate = $state(false)
	let combine = $state(/** @type {'and' | 'or' | 'replace'} */ ('and'))

	const fieldMeta = $derived(getField(field))
	const fieldType = $derived(fieldMeta?.type ?? 'string')
	const isString = $derived(fieldType === 'string')
	const needsName = $derived(!!fieldMeta?.hasName)
	const operators = $derived(operatorsForType(fieldType))
	const multi = $derived(isMultiOperator(operator))
	// Regex uses (?i); lower() doesn't apply, so hide the case-insensitive note distinction is handled in the module.

	const fieldOptions = fields.map((f) => ({ value: f.value, label: f.label }))
	const operatorOptions = $derived(operators.map((o) => ({ value: o.value, label: o.label })))
	const combineOptions = [
		{ value: 'and', label: 'AND — both must match' },
		{ value: 'or', label: 'OR — either matches' },
		{ value: 'replace', label: 'Replace existing' }
	]

	const spec = $derived({
		field,
		name,
		operator,
		value,
		values,
		caseInsensitive,
		urlDecode,
		negate
	})

	const preview = $derived(buildExpression(spec))
	const canInsert = $derived(preview !== '')
	const finalExpression = $derived(
		canInsert ? combineExpression(existing, preview, existing.trim() ? combine : 'replace') : ''
	)

	// Keep the operator valid when the field type changes (e.g. switching from a
	// string field to Remote IP must not leave "contains any of" selected).
	$effect(() => {
		const valid = operators.some((o) => o.value === operator)
		if (!valid) operator = operators[0]?.value ?? ''
	})

	/**
	 * Open the builder, seeded with the rule's current expression.
	 * @param {string} [currentExpression]
	 */
	export function open (currentExpression) {
		// Reset to defaults so a fresh build never inherits stale controls
		// (e.g. a Negate checkbox left checked from a previous open).
		field = 'path'
		name = ''
		operator = 'equals'
		value = ''
		values = ''
		caseInsensitive = false
		urlDecode = false
		negate = false
		combine = 'and'
		existing = currentExpression ?? ''
		isActive = true
	}

	function close () {
		isActive = false
	}

	function insert () {
		if (!canInsert) return
		oninsert?.(finalExpression)
		close()
	}
</script>

<div class="modal" class:is-active={isActive} aria-hidden={!isActive}>
	<div class="modal-panel">
		<div class="modal-close" onclick={close} onkeypress={close} tabindex="0" role="button">✕</div>
		<h4><strong>Expression builder</strong></h4>
		<p class="text-content/60 text-sm mt-1">
			Compose one condition, then insert the generated CEL into the rule.
		</p>

		<div class="grid gap-4 mt-5">
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="field">
					<label for="waf-field">Field</label>
					<Select id="waf-field" bind:value={field} options={fieldOptions} />
				</div>

				{#if needsName}
					<div class="field">
						<label for="waf-name">Name</label>
						<div class="input">
							<input id="waf-name" bind:value={name}
								placeholder={field === 'header' ? 'e.g. user-agent' : field === 'cookie' ? 'e.g. session' : 'e.g. token'}>
						</div>
					</div>
				{/if}
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="field">
					<label for="waf-operator">Operator</label>
					<Select id="waf-operator" bind:value={operator} options={operatorOptions} />
				</div>
			</div>

			{#if multi}
				<div class="field">
					<label for="waf-values">Values</label>
					<div class="textarea">
						<textarea id="waf-values" rows="4" bind:value={values}
							placeholder="One value per line (commas also accepted)"></textarea>
					</div>
				</div>
			{:else}
				<div class="field">
					<label for="waf-value">
						{#if fieldType === 'numeric'}Number
						{:else if fieldType === 'ip' && operator === 'in_cidr'}CIDR
						{:else if operator === 'matches_regex'}Pattern
						{:else}Value{/if}
					</label>
					<div class="input">
						<input id="waf-value" class="font-mono" bind:value
							inputmode={fieldType === 'numeric' ? 'numeric' : undefined}
							placeholder={fieldType === 'numeric'
								? 'e.g. 1048576'
								: fieldType === 'ip' && operator === 'in_cidr'
									? 'e.g. 10.0.0.0/8'
									: operator === 'matches_regex'
										? 'e.g. ^/api/v[0-9]+/'
										: 'Value'}>
					</div>
				</div>
			{/if}

			<div class="flex flex-wrap gap-x-6 gap-y-2">
				{#if isString}
					<div class="checkbox">
						<input id="waf-ci" type="checkbox" bind:checked={caseInsensitive}>
						<label for="waf-ci">Case-insensitive</label>
					</div>
					<div class="checkbox">
						<input id="waf-url" type="checkbox" bind:checked={urlDecode}>
						<label for="waf-url">URL-decode first</label>
					</div>
				{/if}
				<div class="checkbox">
					<input id="waf-negate" type="checkbox" bind:checked={negate}>
					<label for="waf-negate">Negate (NOT)</label>
				</div>
			</div>

			{#if existing.trim()}
				<div class="field">
					<label for="waf-combine">Combine with existing expression</label>
					<Select id="waf-combine" bind:value={combine} options={combineOptions} />
				</div>
			{/if}

			<div class="field">
				<label for="waf-preview">CEL preview</label>
				<div class="preview font-mono" id="waf-preview">
					{#if canInsert}
						{finalExpression}
					{:else}
						<span class="text-content/40">Fill in the controls above to generate an expression…</span>
					{/if}
				</div>
			</div>

			<div class="flex justify-end gap-3">
				<button type="button" class="button is-variant-secondary" onclick={close}>Cancel</button>
				<button type="button" class="button" disabled={!canInsert} onclick={insert}>
					{existing.trim() && combine !== 'replace' ? 'Insert & combine' : 'Insert'}
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.modal-panel {
		width: 100%;
		max-width: 40rem;
	}

	.preview {
		padding: 0.75rem;
		border-radius: var(--radius-md);
		background-color: hsl(var(--hsl-base-400) / 0.2);
		border: 1px solid hsl(var(--hsl-line));
		font-size: 0.8125rem;
		line-height: 1.5;
		word-break: break-all;
		white-space: pre-wrap;
		min-height: 2.75rem;
	}

	:root:not(.dark) .preview {
		background-color: hsl(var(--hsl-base-100));
	}
</style>
