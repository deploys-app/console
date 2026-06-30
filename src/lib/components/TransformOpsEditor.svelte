<script lang="ts">
	import Select from '$lib/components/Select.svelte'
	import TagInput from '$lib/components/TagInput.svelte'
	import {
		phaseOpTypes,
		opTypeLabels,
		opTypeIcons,
		redirectStatusOptions,
		blankOp,
		genOpId,
		type OpForm
	} from '$lib/transform/rules'

	interface Props {
		// The rule's ordered op list (bindable).
		ops: OpForm[]
		// The rule's phase — gates which op types are offered.
		phase: Api.TransformPhase
	}

	let { ops = $bindable(), phase }: Props = $props()

	// Op-type options for the current phase, shown in each op's type Select.
	const typeOptions = $derived(
		phaseOpTypes[phase].map((t) => ({ value: t, label: opTypeLabels[t] }))
	)

	function addOp () {
		ops = [...ops, blankOp(phase, ops.map((o) => o.id))]
	}

	function removeOp (i: number) {
		ops = ops.filter((_, k) => k !== i)
	}

	function moveOp (i: number, dir: -1 | 1) {
		const j = i + dir
		if (j < 0 || j >= ops.length) return
		const next = [...ops]
		;[next[i], next[j]] = [next[j], next[i]]
		ops = next
	}

	function addQueryRow (op: OpForm) {
		op.query = [...op.query, { id: genOpId(op.query.map((q) => q.id)), key: '', value: '' }]
	}

	function removeQueryRow (op: OpForm, i: number) {
		op.query = op.query.filter((_, k) => k !== i)
	}
</script>

<div class="grid gap-3">
	{#each ops as op, i (op.id)}
		<div class="op-card">
			<div class="op-head">
				<span class="op-icon"><i class="fa-solid {opTypeIcons[op.type]}"></i></span>
				<div class="op-type">
					<Select bind:value={op.type} options={typeOptions} />
				</div>
				<div class="op-actions">
					<button type="button" class="icon-button" aria-label="Move operation up"
						disabled={i === 0} onclick={() => moveOp(i, -1)}>
						<i class="fa-solid fa-chevron-up"></i>
					</button>
					<button type="button" class="icon-button" aria-label="Move operation down"
						disabled={i === ops.length - 1} onclick={() => moveOp(i, 1)}>
						<i class="fa-solid fa-chevron-down"></i>
					</button>
					<button type="button" class="icon-button" aria-label="Remove operation"
						disabled={ops.length === 1} onclick={() => removeOp(i)}>
						<i class="fa-solid fa-trash-alt"></i>
					</button>
				</div>
			</div>

			<div class="op-body">
				{#if op.type === 'set-header'}
					<div class="grid gap-3 sm:grid-cols-2">
						<div class="field">
							<label for={`op-${op.id}-name`}>Header name</label>
							<div class="input">
								<input id={`op-${op.id}-name`} class="font-mono" bind:value={op.name} placeholder="e.g. Strict-Transport-Security">
							</div>
						</div>
						<div class="field">
							<label for={`op-${op.id}-value`}>Value</label>
							<div class="input">
								<input id={`op-${op.id}-value`} class="font-mono" bind:value={op.value} placeholder="e.g. max-age=63072000">
							</div>
						</div>
					</div>
				{:else if op.type === 'remove-header'}
					<div class="field sm:max-w-md">
						<label for={`op-${op.id}-name`}>Header name</label>
						<div class="input">
							<input id={`op-${op.id}-name`} class="font-mono" bind:value={op.name} placeholder="e.g. X-Powered-By">
						</div>
					</div>
				{:else if op.type === 'rewrite-path'}
					<div class="grid gap-3">
						<div class="tabs is-variant-underline" role="tablist">
							<button type="button" class="tab-button" class:is-active={op.pathMode === 'path'}
								role="tab" aria-selected={op.pathMode === 'path'}
								onclick={() => (op.pathMode = 'path')}>
								<i class="fa-solid fa-equals mr-2"></i><span>Literal path</span>
							</button>
							<button type="button" class="tab-button" class:is-active={op.pathMode === 'regex'}
								role="tab" aria-selected={op.pathMode === 'regex'}
								onclick={() => (op.pathMode = 'regex')}>
								<i class="fa-solid fa-asterisk mr-2"></i><span>Regex</span>
							</button>
						</div>
						{#if op.pathMode === 'path'}
							<div class="field">
								<label for={`op-${op.id}-path`}>Replacement path</label>
								<div class="input">
									<input id={`op-${op.id}-path`} class="font-mono" bind:value={op.path} placeholder="e.g. /api/v2/users">
								</div>
							</div>
						{:else}
							<div class="grid gap-3 sm:grid-cols-2">
								<div class="field">
									<label for={`op-${op.id}-regex`}>Pattern (RE2)</label>
									<div class="input">
										<input id={`op-${op.id}-regex`} class="font-mono" bind:value={op.regex} placeholder="e.g. ^/api/v1/(.*)$">
									</div>
								</div>
								<div class="field">
									<label for={`op-${op.id}-replace`}>Replacement</label>
									<div class="input">
										<input id={`op-${op.id}-replace`} class="font-mono" bind:value={op.replace} placeholder="e.g. /api/v2/$1">
									</div>
								</div>
							</div>
						{/if}
					</div>
				{:else if op.type === 'rewrite-query'}
					<div class="grid gap-3">
						<div class="field">
							<span class="label">Set query parameters</span>
							{#if op.query.length}
								<div class="grid gap-2">
									{#each op.query as row, qi (row.id)}
										<div class="query-row">
											<input class="input font-mono" bind:value={row.key} placeholder="name" aria-label="Query parameter name">
											<input class="input font-mono" bind:value={row.value} placeholder="value" aria-label="Query parameter value">
											<button type="button" class="icon-button" aria-label="Remove query parameter" onclick={() => removeQueryRow(op, qi)}>
												<i class="fa-solid fa-xmark"></i>
											</button>
										</div>
									{/each}
								</div>
							{/if}
							<button type="button" class="button is-variant-tertiary is-size-small justify-self-start mt-1" onclick={() => addQueryRow(op)}>
								<i class="fa-solid fa-plus mr-2"></i><span>Add parameter</span>
							</button>
						</div>
						<div class="field">
							<label for={`op-${op.id}-removeq`}>Remove query parameters</label>
							<TagInput id={`op-${op.id}-removeq`} bind:tags={op.removeQuery} placeholder="Type a parameter name, press Enter" />
						</div>
					</div>
				{:else if op.type === 'redirect'}
					<div class="grid gap-3 sm:grid-cols-2">
						<div class="field">
							<label for={`op-${op.id}-to`}>Redirect to</label>
							<div class="input">
								<input id={`op-${op.id}-to`} class="font-mono" bind:value={op.to} placeholder="e.g. https://www.acme.com$uri">
							</div>
							<p class="text-content/50 text-xs mt-1">
								Use <code class="font-mono">$uri</code> for the original request URI.
							</p>
						</div>
						<div class="field">
							<label for={`op-${op.id}-status`}>Status</label>
							<Select id={`op-${op.id}-status`} bind:value={op.status} options={redirectStatusOptions} placeholder="302 — Found" />
						</div>
					</div>
				{:else if op.type === 'set-status'}
					<div class="field sm:max-w-xs">
						<label for={`op-${op.id}-status`}>Response status</label>
						<div class="input">
							<input id={`op-${op.id}-status`} class="font-mono" type="number" min="100" max="599" bind:value={op.status} placeholder="e.g. 204">
						</div>
					</div>
				{:else if op.type === 'cors'}
					<div class="grid gap-3">
						<div class="field">
							<label for={`op-${op.id}-origins`}>Allowed origins</label>
							<TagInput id={`op-${op.id}-origins`} bind:tags={op.allowOrigins} placeholder="e.g. https://app.acme.com (or *)" />
						</div>
						<div class="grid gap-3 sm:grid-cols-2">
							<div class="field">
								<label for={`op-${op.id}-methods`}>Allowed methods</label>
								<TagInput id={`op-${op.id}-methods`} bind:tags={op.allowMethods} placeholder="e.g. GET, POST" />
							</div>
							<div class="field">
								<label for={`op-${op.id}-headers`}>Allowed headers</label>
								<TagInput id={`op-${op.id}-headers`} bind:tags={op.allowHeaders} placeholder="e.g. Authorization" />
							</div>
						</div>
						<div class="grid gap-3 sm:grid-cols-2">
							<div class="field">
								<label for={`op-${op.id}-expose`}>Exposed headers</label>
								<TagInput id={`op-${op.id}-expose`} bind:tags={op.exposeHeaders} placeholder="e.g. X-Request-Id" />
							</div>
							<div class="field">
								<label for={`op-${op.id}-maxage`}>Max age</label>
								<div class="input">
									<input id={`op-${op.id}-maxage`} class="font-mono" bind:value={op.maxAge} placeholder="e.g. 1h">
								</div>
							</div>
						</div>
						<label class="checkbox">
							<input type="checkbox" bind:checked={op.allowCredentials}>
							Allow credentials (cannot be combined with the “*” origin)
						</label>
					</div>
				{/if}
			</div>
		</div>
	{/each}

	<button type="button" class="button is-variant-secondary justify-self-start" onclick={addOp}>
		<i class="fa-solid fa-plus mr-2"></i><span>Add operation</span>
	</button>
</div>

<style>
	.op-card {
		border: 1px solid hsl(var(--hsl-line) / 0.8);
		border-radius: var(--radius-lg);
		background: hsl(var(--hsl-base-200) / 0.4);
	}

	.op-head {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.625rem 0.75rem;
		border-bottom: 1px solid hsl(var(--hsl-line) / 0.6);
	}

	.op-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		flex-shrink: 0;
		border-radius: 0.5rem;
		font-size: 0.75rem;
		color: hsl(var(--hsl-primary));
		background: hsl(var(--hsl-primary) / 0.12);
	}

	.op-type {
		flex: 1;
		min-width: 0;
		max-width: 16rem;
	}

	.op-actions {
		display: flex;
		gap: 0.25rem;
		margin-left: auto;
	}

	.op-body {
		padding: 0.875rem 0.75rem;
	}

	.query-row {
		display: grid;
		grid-template-columns: 1fr 1fr auto;
		align-items: center;
		gap: 0.5rem;
	}
</style>
