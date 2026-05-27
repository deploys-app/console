<script>
	import { untrack } from 'svelte'
	import WafConditionRow from '$lib/components/WafConditionRow.svelte'
	import { buildGroup, parseExpression } from '$lib/waf/expression'

	/**
	 * @typedef {import('$lib/waf/expression').ExpressionSpec} ExpressionSpec
	 * @typedef {import('$lib/waf/expression').Combinator} Combinator
	 */

	/**
	 * @typedef {Object} Props
	 * @property {string} expression  bindable CEL expression — kept in two-way sync with the rows
	 */

	/** @type {Props} */
	let { expression = $bindable('') } = $props()

	/** A fresh blank condition row. */
	function blankCondition () {
		return /** @type {ExpressionSpec} */ ({ field: 'path', operator: 'equals', value: '' })
	}

	// Seed the rows + combinator from the incoming expression. A non-parseable
	// expression should never reach the visual builder (the page gates on
	// `canUseVisual`), but fall back to empty if it does.
	const seed = untrack(() => parseExpression(expression)) ?? { combinator: 'and', conditions: [] }

	/** @type {ExpressionSpec[]} */
	let conditions = $state(seed.conditions)
	/** @type {Combinator} */
	let combinator = $state(seed.combinator)

	// The CEL string this builder's current rows generate.
	const generated = $derived(buildGroup(combinator, conditions))

	// Two-way sync, guarded against feedback loops.
	//
	// Outward: whenever the rows/combinator produce a CEL string that differs
	// from the bound `expression`, write it back.
	$effect(() => {
		const next = generated
		if (next !== untrack(() => expression)) expression = next
	})

	// Inward: when the external `expression` changes to something parseable that
	// no longer matches what the rows currently generate (e.g. the user edited
	// raw CEL then switched to Visual), reseed the rows. Only reseed on a real
	// difference so typing in a row doesn't clobber itself.
	$effect(() => {
		const expr = expression
		const current = untrack(() => generated)
		if (expr === current) return
		const parsed = parseExpression(expr)
		if (!parsed) return // not representable — leave rows as-is (page keeps raw)
		conditions = parsed.conditions
		combinator = parsed.combinator
	})

	function addCondition () {
		conditions = [...conditions, blankCondition()]
	}

	/** @param {number} i */
	function removeCondition (i) {
		conditions = conditions.filter((_, idx) => idx !== i)
	}

	// Reset to an empty expression (wired to the page's Clear control).
	export function clearExpression () {
		conditions = []
		combinator = 'and'
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
		<code class="font-mono">.country</code>,
		<code class="font-mono">.asn</code>,
		<code class="font-mono">.content_length</code>,
		<code class="font-mono">.headers[…]</code>,
		<code class="font-mono">.args[…]</code>,
		<code class="font-mono">.cookies[…]</code>.
	</p>

	{#if conditions.length >= 2}
		<div class="flex items-center gap-3">
			<span class="text-content/70 text-sm">Match when</span>
			<div class="tabs is-variant-underline" role="tablist" aria-label="Combine conditions">
				<button type="button" class="tab-button" class:is-active={combinator === 'and'}
					role="tab" aria-selected={combinator === 'and'}
					onclick={() => (combinator = 'and')}>
					<span>ALL (AND)</span>
				</button>
				<button type="button" class="tab-button" class:is-active={combinator === 'or'}
					role="tab" aria-selected={combinator === 'or'}
					onclick={() => (combinator = 'or')}>
					<span>ANY (OR)</span>
				</button>
			</div>
			<span class="text-content/50 text-sm">of the conditions match</span>
		</div>
	{/if}

	{#if conditions.length === 0}
		<p class="text-content/50 text-sm">No conditions yet. Add one to start matching requests.</p>
	{:else}
		<div class="grid gap-3">
			{#each conditions as condition, i (i)}
				<div class="grid gap-2">
					{#if i > 0}
						<div class="joiner text-content/50 text-xs font-mono">
							{combinator === 'or' ? 'OR' : 'AND'}
						</div>
					{/if}
					<WafConditionRow bind:condition={conditions[i]} onremove={() => removeCondition(i)} />
				</div>
			{/each}
		</div>
	{/if}

	<div class="flex justify-start">
		<button type="button" class="button is-variant-secondary is-size-small" onclick={addCondition}>
			<i class="fa-solid fa-plus mr-2"></i>
			<span>Add condition</span>
		</button>
	</div>
</div>

<style>
	.joiner {
		padding-left: 0.25rem;
		letter-spacing: 0.05em;
	}
</style>
