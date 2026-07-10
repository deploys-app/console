<script lang="ts">
	/**
	 * Collapsible waf.test dry-run panel. Two modes, one result shape:
	 * `expression` (rule/filter editors — tests one CEL expression) or
	 * `rules`+`limits` (manage page — tests a whole zone draft). Nothing is
	 * stored server-side; the RPC only needs the read-only waf.get permission.
	 */
	import api from '$lib/api'
	import CountrySelect from '$lib/components/CountrySelect.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import Select from '$lib/components/Select.svelte'
	import { actionLabels } from '$lib/waf/rules'
	import type { KvRow } from '$lib/waf/test'
	import {
		limitNote,
		methodOptions,
		outcomeText,
		rememberSample,
		schemeOptions,
		seedSample,
		toWafTestRequest
	} from '$lib/waf/test'

	interface Props {
		project: string
		location: string
		/** expression mode — dry-run one CEL expression (rule/filter editors) */
		expression?: string
		/** draft mode — dry-run a whole zone draft (manage page) */
		rules?: Api.WafRule[]
		limits?: Api.WafLimit[]
	}

	const { project, location, expression, rules, limits }: Props = $props()

	const expressionMode = $derived(expression !== undefined)
	// Nothing to test: an empty expression, or a zone with no rules and no
	// limits — both are rejected by waf.test's validation (the mode would be
	// ambiguous), so the panel disables itself instead of sending an
	// always-invalid request.
	const testable = $derived(expressionMode
		? !!expression?.trim()
		: (rules?.length ?? 0) + (limits?.length ?? 0) > 0)

	let open = $state(false)
	const sample = $state(seedSample())
	let running = $state(false)
	let result = $state<Api.WafTestResult | null>(null)
	let runErrors = $state<string[]>([])

	// A result (or error) describes the exact draft it ran against — remember
	// that draft's fingerprint and only show it while it still matches, so a
	// stale verdict can't mislead after the draft changes underneath.
	const draftKey = $derived(JSON.stringify(expressionMode ? expression : [rules, limits]))
	let ranKey = $state('')

	function addRow (rows: KvRow[]) {
		rows.push({ k: '', v: '' })
	}

	function removeRow (rows: KvRow[], i: number) {
		rows.splice(i, 1)
	}

	async function run () {
		if (running || !testable) return
		running = true
		runErrors = []
		try {
			rememberSample(sample)
			const payload = {
				project,
				location,
				...(expressionMode
					? { expression }
					: { rules: rules ?? [], limits: limits ?? [] }),
				request: toWafTestRequest(sample)
			}
			const resp = await api.invoke<Api.WafTestResult>('waf.test', payload, fetch)
			ranKey = draftKey
			if (!resp.ok) {
				result = null
				// A validate error carries per-item messages (which sample field
				// or draft item was rejected) — show those, not the generic
				// envelope message.
				runErrors = resp.error?.validate?.length
					? resp.error.validate
					: [resp.error?.message ?? 'test failed']
				return
			}
			result = resp.result ?? null
		} finally {
			running = false
		}
	}
</script>

{#snippet kvEditor(title: string, rows: KvRow[], addLabel: string)}
	<div class="grid gap-2 content-start">
		<span class="label">{title}</span>
		{#each rows as row, i (i)}
			<div class="flex items-center gap-2">
				<div class="input flex-1">
					<input class="font-mono" bind:value={row.k} placeholder="name" aria-label={`${title} name`}>
				</div>
				<span class="text-content/40">:</span>
				<div class="input flex-1">
					<input class="font-mono" bind:value={row.v} placeholder="value" aria-label={`${title} value`}>
				</div>
				<button type="button" class="icon-button" aria-label={`Remove ${title.toLowerCase()} row`}
					onclick={() => removeRow(rows, i)}>
					<i class="fa-solid fa-trash-alt"></i>
				</button>
			</div>
		{/each}
		<div>
			<button type="button" class="button is-variant-secondary is-size-small" onclick={() => addRow(rows)}>
				<i class="fa-solid fa-plus mr-2"></i>
				<span>{addLabel}</span>
			</button>
		</div>
	</div>
{/snippet}

<div class="panel is-level-400 grid gap-4">
	<button type="button" class="test-toggle" aria-expanded={open} onclick={() => (open = !open)}>
		<div class="text-left">
			<h6><strong>Test</strong></h6>
			<p class="text-content/50 text-sm mt-1">
				{#if expressionMode}
					Dry-run this expression against a sample request — nothing is stored.
				{:else}
					Dry-run the zone against a sample request — nothing is stored.
				{/if}
			</p>
		</div>
		<i class="fa-solid fa-chevron-down transition-transform" class:rotate-180={open}></i>
	</button>

	{#if open}
		{#if !testable}
			<p class="text-content/50 text-sm">
				{#if expressionMode}
					Nothing to test yet — add a condition first.
				{:else}
					No rules or limits to test.
				{/if}
			</p>
		{:else}
			<div class="grid gap-4">
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div class="field">
						<label for="waf-test-method">Method</label>
						<Select id="waf-test-method" bind:value={sample.method} options={methodOptions} />
					</div>
					<div class="field">
						<label for="waf-test-path">Path</label>
						<div class="input">
							<input id="waf-test-path" class="font-mono" bind:value={sample.path} placeholder="/">
						</div>
					</div>
					<div class="field">
						<label for="waf-test-host">Host</label>
						<div class="input">
							<input id="waf-test-host" class="font-mono" bind:value={sample.host} placeholder="app.example.com">
						</div>
					</div>
					<div class="field">
						<label for="waf-test-query">Query string</label>
						<div class="input">
							<input id="waf-test-query" class="font-mono" bind:value={sample.query} placeholder="key=value">
						</div>
					</div>
					<div class="field">
						<label for="waf-test-scheme">Scheme</label>
						<Select id="waf-test-scheme" bind:value={sample.scheme} options={schemeOptions} />
					</div>
					<div class="field">
						<label for="waf-test-ip">Client IP</label>
						<div class="input">
							<input id="waf-test-ip" class="font-mono" bind:value={sample.ip} placeholder="203.0.113.7">
						</div>
					</div>
					<div class="field">
						<label for="waf-test-country">Country</label>
						<CountrySelect id="waf-test-country" bind:value={sample.country} />
					</div>
					<div class="field">
						<label for="waf-test-asn">ASN</label>
						<div class="input">
							<input id="waf-test-asn" type="number" min="0" bind:value={sample.asn} placeholder="13335">
						</div>
					</div>
				</div>

				<p class="text-content/50 text-xs">
					Country and ASN are simulation inputs — production resolves them via GeoIP at the edge.
				</p>

				<div class="grid gap-4 lg:grid-cols-2">
					{@render kvEditor('Headers', sample.headers, 'Add header')}
					{@render kvEditor('Cookies', sample.cookies, 'Add cookie')}
				</div>

				<div>
					<GuardedButton permission="waf.get" class="button is-icon-left" loading={running} onclick={run}>
						<i class="fa-solid fa-flask"></i>
						Run test
					</GuardedButton>
				</div>

				{#if runErrors.length > 0 && ranKey === draftKey}
					<div class="grid gap-1">
						{#each runErrors as e, i (i)}
							<p class="text-negative text-sm">{e}</p>
						{/each}
					</div>
				{/if}

				{#if result && ranKey === draftKey}
					<div class="outcome-banner" data-outcome={result.outcome}>
						<strong>{outcomeText(result)}</strong>
					</div>

					{#if !result.valid}
						<p class="text-negative text-sm">
							Some expressions failed to compile — this draft would be rejected on save.
						</p>
					{/if}

					{#if result.rules.length > 0}
						<div class="grid gap-2">
							<span class="label">Rules (evaluation order)</span>
							{#each result.rules as rule, i (i)}
								<div class="result-row">
									<span class="font-mono text-sm">{rule.id}</span>
									<span class="action-badge" data-action={rule.action}>
										{actionLabels[rule.action] ?? rule.action}
									</span>
									{#if rule.error}
										<span class="state-badge" data-state="error">Error</span>
									{:else if rule.matched}
										<span class="state-badge" data-state="matched">Matched</span>
									{:else}
										<span class="state-badge">Not matched</span>
									{/if}
									{#if !rule.evaluated}
										<span class="state-badge">Not evaluated</span>
									{/if}
									{#if rule.terminal}
										<span class="state-badge" data-state="terminal">Decided the outcome</span>
									{/if}
									{#if rule.error}
										<p class="basis-full text-negative text-xs font-mono">{rule.error}</p>
									{/if}
								</div>
							{/each}
						</div>
					{/if}

					{#if result.limits.length > 0}
						<div class="grid gap-2">
							<span class="label">Rate limits</span>
							{#each result.limits as limit, i (i)}
								<div class="result-row">
									<span class="font-mono text-sm">{limit.id}</span>
									{#if limit.mode === 'shadow'}
										<span class="state-badge">Shadow</span>
									{/if}
									{#if limit.error}
										<span class="state-badge" data-state="error">Error</span>
										<p class="basis-full text-negative text-xs font-mono">{limit.error}</p>
									{:else}
										<span class="text-content/60 text-sm">{limitNote(limit, result)}</span>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	.test-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		width: 100%;
		cursor: pointer;
	}

	.outcome-banner {
		padding: 0.75rem 1rem;
		border-radius: var(--radius-md);
		border: 1px solid hsl(var(--hsl-line));
		background-color: hsl(var(--hsl-content) / 0.04);
	}

	.outcome-banner[data-outcome='allow'] {
		border-color: hsl(var(--hsl-positive) / 0.4);
		background-color: hsl(var(--hsl-positive) / 0.08);
		color: hsl(var(--hsl-positive));
	}

	.outcome-banner[data-outcome='block'] {
		border-color: hsl(var(--hsl-negative) / 0.4);
		background-color: hsl(var(--hsl-negative) / 0.08);
		color: hsl(var(--hsl-negative));
	}

	.result-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-md);
		border: 1px solid hsl(var(--hsl-line));
	}

	.action-badge,
	.state-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.125rem 0.625rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		line-height: 1.5;
		color: hsl(var(--hsl-content) / 0.55);
		background-color: hsl(var(--hsl-content) / 0.06);
	}

	.action-badge[data-action='block'] {
		color: hsl(var(--hsl-negative));
		background-color: hsl(var(--hsl-negative) / 0.12);
	}

	.action-badge[data-action='allow'] {
		color: hsl(var(--hsl-positive));
		background-color: hsl(var(--hsl-positive) / 0.12);
	}

	.state-badge[data-state='matched'] {
		color: hsl(var(--hsl-positive));
		background-color: hsl(var(--hsl-positive) / 0.12);
	}

	.state-badge[data-state='error'] {
		color: hsl(var(--hsl-negative));
		background-color: hsl(var(--hsl-negative) / 0.12);
	}

	.state-badge[data-state='terminal'] {
		color: hsl(var(--hsl-content) / 0.85);
		background-color: hsl(var(--hsl-content) / 0.12);
	}
</style>
