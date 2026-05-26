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
	 * @property {string} expression    bindable CEL expression composed so far
	 * @property {boolean} [showPreview] render the built-in readonly CEL preview + Clear (default true)
	 */

	/** @type {Props} */
	let { expression = $bindable(''), showPreview = true } = $props()

	// --- embedded condition-builder spec (component-local form state) ---
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

	// Live preview of the single condition the builder controls describe.
	const preview = $derived(buildExpression(spec))
	const canAdd = $derived(preview !== '')

	// Keep the operator valid when the field type changes (e.g. switching from a
	// string field to Remote IP must not leave "contains any of" selected).
	$effect(() => {
		const valid = operators.some((o) => o.value === operator)
		if (!valid) operator = operators[0]?.value ?? ''
	})

	function resetBuilder () {
		field = 'path'
		name = ''
		operator = 'equals'
		value = ''
		values = ''
		caseInsensitive = false
		urlDecode = false
		negate = false
		combine = 'and'
	}

	// Apply the builder's condition to the expression. When the expression
	// already has a value we honour the AND/OR/Replace choice; otherwise we
	// just set it.
	function addCondition () {
		if (!canAdd) return
		const mode = expression.trim() ? combine : 'replace'
		expression = combineExpression(expression, preview, mode)
		resetBuilder()
	}

	// Exported so a parent that hides the built-in preview can still wire up a
	// shared Clear control of its own.
	export function clearExpression () {
		expression = ''
	}
</script>

<div class="grid gap-4">
	<p class="text-content/60 text-sm">
		Match on
		<code class="font-mono">request.method</code>,
		<code class="font-mono">.path</code>,
		<code class="font-mono">.host</code>,
		<code class="font-mono">.query</code>,
		<code class="font-mono">.uri</code>,
		<code class="font-mono">.scheme</code>,
		<code class="font-mono">.user_agent</code>,
		<code class="font-mono">.referer</code>,
		<code class="font-mono">.remote_ip</code>,
		<code class="font-mono">.content_length</code>,
		<code class="font-mono">.body</code>,
		<code class="font-mono">.headers[…]</code>,
		<code class="font-mono">.args[…]</code>,
		<code class="font-mono">.cookies[…]</code>.
	</p>

	{#if showPreview}
		<div class="field">
			<label for="rule-expression">Expression (CEL)</label>
			<div class="textarea">
				<textarea id="rule-expression" class="font-mono" rows="2" readonly bind:value={expression}
					placeholder="Use the builder below to compose this rule’s condition"></textarea>
			</div>
			<div class="flex gap-2 justify-self-start mt-2">
				<button type="button" class="button is-variant-tertiary is-size-small"
					disabled={!expression}
					onclick={clearExpression}>
					<i class="fa-solid fa-eraser mr-2"></i>
					<span>Clear</span>
				</button>
			</div>
		</div>
	{/if}

	<div class="builder grid gap-4">
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

		{#if expression.trim()}
			<div class="field">
				<label for="waf-combine">Combine with existing expression</label>
				<Select id="waf-combine" bind:value={combine} options={combineOptions} />
			</div>
		{/if}

		<div class="field">
			<label for="waf-preview">Condition preview</label>
			<div class="preview font-mono" id="waf-preview">
				{#if canAdd}
					{preview}
				{:else}
					<span class="text-content/40">Fill in the controls above to generate a condition…</span>
				{/if}
			</div>
		</div>

		<div class="flex justify-end">
			<button type="button" class="button is-variant-secondary" disabled={!canAdd} onclick={addCondition}>
				<i class="fa-solid fa-plus mr-2"></i>
				<span>{expression.trim() && combine !== 'replace' ? 'Add condition' : 'Set condition'}</span>
			</button>
		</div>
	</div>
</div>

<style>
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

	.builder {
		padding: 1rem;
		border-radius: var(--radius-md);
		border: 1px solid hsl(var(--hsl-line));
		background-color: hsl(var(--hsl-base-400) / 0.12);
	}

	:root:not(.dark) .builder {
		background-color: hsl(var(--hsl-base-100) / 0.6);
	}
</style>
