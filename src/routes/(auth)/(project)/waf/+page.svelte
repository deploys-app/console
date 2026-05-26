<script>
	import { untrack } from 'svelte'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import Select from '$lib/components/Select.svelte'
	import DangerZone from '$lib/components/DangerZone.svelte'
	import WafExpressionModal from '$lib/components/WafExpressionModal.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const locations = $derived(data.locations)

	/**
	 * @typedef {Object} RuleForm
	 * @property {string} id
	 * @property {string} description
	 * @property {string} expression
	 * @property {'log' | 'allow' | 'block'} action
	 * @property {number | null} status
	 * @property {string} message
	 */

	const actionOptions = [
		{ value: 'log', label: 'Log' },
		{ value: 'allow', label: 'Allow' },
		{ value: 'block', label: 'Block' }
	]

	const DEFAULT_STATUS = 403
	const DEFAULT_MESSAGE = 'Forbidden'

	/**
	 * @param {Api.WafRule} [rule]
	 * @returns {RuleForm}
	 */
	function ruleForm (rule) {
		return {
			id: rule?.id ?? '',
			description: rule?.description ?? '',
			expression: rule?.expression ?? '',
			action: rule?.action ?? 'log',
			status: rule?.status ?? DEFAULT_STATUS,
			message: rule?.message ?? DEFAULT_MESSAGE
		}
	}

	// Rule ids are auto-generated and stable for the life of a rule (they appear
	// in parapet's logs/metrics as rule_id), so they must survive reordering.
	/**
	 * @param {string[]} taken
	 * @returns {string}
	 */
	function genId (taken) {
		let id
		do {
			id = 'rule-' + Math.random().toString(36).slice(2, 8)
		} while (taken.includes(id))
		return id
	}

	// Map API rules to form rows: order by priority (lower runs first) so the
	// visible order is the execution order, and give every row a unique id.
	/**
	 * @param {Api.WafRule[]} [apiRules]
	 * @returns {RuleForm[]}
	 */
	function normalizeRules (apiRules) {
		const sorted = [...(apiRules ?? [])].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
		/** @type {string[]} */
		const taken = []
		return sorted.map((r) => {
			const f = ruleForm(r)
			if (!f.id || taken.includes(f.id)) f.id = genId(taken)
			taken.push(f.id)
			return f
		})
	}

	// The whole zone is one editable form, seeded from the initial load. The
	// selected location and its zone are component state so the selector can swap
	// zones in place without a full navigation.
	const form = $state(untrack(() => ({
		location: data.location ?? '',
		description: data.zone?.description ?? '',
		rules: normalizeRules(data.zone?.rules)
	})))

	// True once the current location has a saved zone (enables the delete action).
	let hasZone = $state(untrack(() => !!data.zone))
	let loading = $state(false)
	let saving = $state(false)

	/** @param {Api.WafZone | null} zone */
	function applyZone (zone) {
		form.description = zone?.description ?? ''
		form.rules = normalizeRules(zone?.rules)
		hasZone = !!zone
	}

	async function loadZone () {
		if (!form.location) {
			applyZone(null)
			return
		}
		loading = true
		try {
			/** @type {Api.Response<Api.WafZone>} */
			const resp = await api.invoke('waf.get', { project, location: form.location }, fetch)
			if (!resp.ok) {
				// Not-found is the unconfigured state — start with an empty editor.
				if (resp.error?.notFound) {
					applyZone(null)
					return
				}
				modal.error({ error: resp.error })
				return
			}
			applyZone(resp.result ?? null)
		} finally {
			loading = false
		}
	}

	function addRule () {
		const taken = form.rules.map((r) => r.id)
		const r = ruleForm()
		r.id = genId(taken)
		form.rules = [...form.rules, r]
	}

	/**
	 * @param {number} i
	 * @param {-1 | 1} dir
	 */
	function moveRule (i, dir) {
		const j = i + dir
		if (j < 0 || j >= form.rules.length) return
		const next = [...form.rules]
		;[next[i], next[j]] = [next[j], next[i]]
		form.rules = next
	}

	/** @type {WafExpressionModal} */
	let expressionModal
	// Index of the rule whose expression the builder is currently editing.
	let builderRuleIndex = -1

	/** @param {number} i */
	function openBuilder (i) {
		builderRuleIndex = i
		expressionModal.open(form.rules[i]?.expression ?? '')
	}

	/** @param {string} expression */
	function applyExpression (expression) {
		const rule = form.rules[builderRuleIndex]
		if (rule) rule.expression = expression
	}

	/** @param {number} i */
	function removeRule (i) {
		form.rules = form.rules.filter((_, k) => k !== i)
	}

	/**
	 * @param {Event} e
	 */
	async function save (e) {
		e.preventDefault()

		if (saving || !form.location) {
			return
		}

		saving = true
		try {
			const rules = form.rules.map((r, i) => ({
				id: r.id,
				description: r.description,
				expression: r.expression,
				action: r.action,
				// Priority follows row order — the top rule runs first.
				priority: i,
				// status + message only apply when blocking.
				...(r.action === 'block'
					? {
						status: Number(r.status) || DEFAULT_STATUS,
						message: r.message || DEFAULT_MESSAGE
					}
					: {})
			}))

			const resp = await api.invoke('waf.set', {
				project,
				location: form.location,
				description: form.description,
				rules
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			modal.success({ content: 'Firewall saved.' })
			await loadZone()
		} finally {
			saving = false
		}
	}

	function deleteZone () {
		modal.confirm({
			title: `Disable the firewall in ${form.location}? All rules will be removed.`,
			yes: 'Disable',
			callback: async () => {
				const resp = await api.invoke('waf.delete', { project, location: form.location }, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				applyZone(null)
			}
		})
	}
</script>

<div class="page-head">
	<div>
		<h4><strong>Firewall</strong></h4>
		<p class="page-sub">Web application firewall rules for this location</p>
	</div>
</div>

<div class="panel is-level-300 grid gap-6">
	<form class="grid gap-4 w-full" onsubmit={save}>
		<div class="field">
			<label for="input-location">Location</label>
			<Select
				id="input-location"
				bind:value={form.location}
				onchange={loadZone}
				required
				placeholder="Select Location"
				options={locations.map((it) => ({ value: it.id, label: it.id }))} />
		</div>

		{#if form.location}
			<div class="field">
				<label for="input-description">Description</label>
				<div class="input">
					<input id="input-description" bind:value={form.description} placeholder="Optional description">
				</div>
			</div>

			<br>
			<hr>
			<br>

			<div class="flex items-center justify-between">
				<div>
					<h6><strong>Rules</strong></h6>
					<p class="text-content/50 text-sm mt-1">
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
						Use <strong>Build…</strong> to compose a condition.
					</p>
				</div>
				{#if loading}
					<span class="text-content/50 text-sm">
						<i class="fa-solid fa-spinner-third fa-spin"></i> Loading…
					</span>
				{/if}
			</div>

			<div class="table-container">
				<table class="table is-variant-compact">
					<thead>
						<tr>
							<th>ID</th>
							<th>Description</th>
							<th>Expression (CEL)</th>
							<th>Action</th>
							<th>Response</th>
							<th class="is-collapse is-align-right">Order</th>
						</tr>
					</thead>
					<tbody>
						{#each form.rules as rule, i (rule.id)}
							<tr>
								<td>
									<span class="font-mono text-sm text-content/60">{rule.id}</span>
								</td>
								<td>
									<div class="input">
										<input bind:value={rule.description} placeholder="Description">
									</div>
								</td>
								<td class="w-full min-w-[20rem]">
									<div class="grid gap-2">
										<div class="textarea">
											<textarea class="font-mono" rows="2" readonly bind:value={rule.expression}
												placeholder="Use Build… to compose this rule’s condition"></textarea>
										</div>
										<div class="flex gap-2 justify-self-start">
											<button type="button" class="button is-variant-secondary is-size-small"
												onclick={() => openBuilder(i)}>
												<i class="fa-solid fa-wand-magic-sparkles mr-2"></i>
												<span>Build…</span>
											</button>
											<button type="button" class="button is-variant-tertiary is-size-small"
												disabled={!rule.expression}
												onclick={() => { rule.expression = '' }}>
												<i class="fa-solid fa-eraser mr-2"></i>
												<span>Clear</span>
											</button>
										</div>
									</div>
								</td>
								<td class="min-w-[8rem]">
									<Select
										bind:value={rule.action}
										options={actionOptions} />
								</td>
								<td class="min-w-[14rem]">
									{#if rule.action === 'block'}
										<div class="grid gap-2">
											<div class="input">
												<input type="number" bind:value={rule.status} placeholder="403"
													aria-label="HTTP status">
											</div>
											<div class="input">
												<input bind:value={rule.message} placeholder="Forbidden"
													aria-label="Response message">
											</div>
										</div>
									{:else}
										<span class="text-content/40 text-sm">—</span>
									{/if}
								</td>
								<td>
									<div class="flex gap-1 justify-end">
										<button class="icon-button" type="button" aria-label="Move rule up"
											disabled={i === 0} onclick={() => moveRule(i, -1)}>
											<i class="fa-solid fa-chevron-up"></i>
										</button>
										<button class="icon-button" type="button" aria-label="Move rule down"
											disabled={i === form.rules.length - 1} onclick={() => moveRule(i, 1)}>
											<i class="fa-solid fa-chevron-down"></i>
										</button>
										<button class="icon-button" type="button" aria-label="Remove rule"
											onclick={() => removeRule(i)}>
											<i class="fa-solid fa-trash-alt"></i>
										</button>
									</div>
								</td>
							</tr>
						{/each}
						{#if form.rules.length === 0}
							<tr>
								<td colspan="6" class="text-center text-content/50">
									No rules yet. Add a rule to start filtering traffic.
								</td>
							</tr>
						{/if}
					</tbody>
					<tfoot>
						<tr>
							<td colspan="6">
								<button class="button is-variant-secondary flex m-auto" type="button"
									onclick={addRule}>
									<i class="fa-solid fa-plus mr-3"></i>
									<span>Add Rule</span>
								</button>
							</td>
						</tr>
					</tfoot>
				</table>
			</div>

			<hr>

			<div class="flex gap-4">
				<button class="button" class:is-loading={saving}>Save</button>
			</div>

			{#if hasZone}
				<DangerZone description="Disable the firewall in this location and permanently remove all of its rules.">
					<button class="button is-variant-negative" type="button" onclick={deleteZone}>Disable firewall</button>
				</DangerZone>
			{/if}
		{/if}
	</form>
</div>

<WafExpressionModal bind:this={expressionModal} oninsert={applyExpression} />
