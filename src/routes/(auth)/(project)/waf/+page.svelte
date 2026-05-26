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
	 * @property {number | null} priority
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
			message: rule?.message ?? DEFAULT_MESSAGE,
			priority: rule?.priority ?? null
		}
	}

	// The whole zone is one editable form, seeded from the initial load. The
	// selected location and its zone are component state so the selector can swap
	// zones in place without a full navigation.
	const form = $state(untrack(() => ({
		location: data.location ?? '',
		description: data.zone?.description ?? '',
		rules: (data.zone?.rules ?? []).map(ruleForm)
	})))

	// True once the current location has a saved zone (enables the delete action).
	let hasZone = $state(untrack(() => !!data.zone))
	let loading = $state(false)
	let saving = $state(false)

	/** @param {Api.WafZone | null} zone */
	function applyZone (zone) {
		form.description = zone?.description ?? ''
		form.rules = (zone?.rules ?? []).map(ruleForm)
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
		form.rules = [...form.rules, ruleForm()]
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
			const rules = form.rules.map((r) => ({
				id: r.id,
				description: r.description,
				expression: r.expression,
				action: r.action,
				priority: Number(r.priority) || 0,
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
							<th>Priority</th>
							<th>Response</th>
							<th class="is-collapse is-align-right"></th>
						</tr>
					</thead>
					<tbody>
						{#each form.rules as rule, i (i)}
							<tr>
								<td>
									<div class="input">
										<input bind:value={rule.id} placeholder="id">
									</div>
								</td>
								<td>
									<div class="input">
										<input bind:value={rule.description} placeholder="Description">
									</div>
								</td>
								<td class="w-full min-w-[20rem]">
									<div class="grid gap-2">
										<div class="textarea">
											<textarea class="font-mono" rows="2" bind:value={rule.expression}
												placeholder="e.g. hasPrefixAny(request.path, [&quot;/admin&quot;])"></textarea>
										</div>
										<button type="button" class="button is-variant-secondary is-size-small justify-self-start"
											onclick={() => openBuilder(i)}>
											<i class="fa-solid fa-wand-magic-sparkles mr-2"></i>
											<span>Build…</span>
										</button>
									</div>
								</td>
								<td class="min-w-[8rem]">
									<Select
										bind:value={rule.action}
										options={actionOptions} />
								</td>
								<td class="min-w-[6rem]">
									<div class="input">
										<input type="number" bind:value={rule.priority} placeholder="0">
									</div>
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
									<button class="icon-button" type="button" aria-label="Remove rule"
										onclick={() => removeRule(i)}>
										<i class="fa-solid fa-trash-alt"></i>
									</button>
								</td>
							</tr>
						{/each}
						{#if form.rules.length === 0}
							<tr>
								<td colspan="7" class="text-center text-content/50">
									No rules yet. Add a rule to start filtering traffic.
								</td>
							</tr>
						{/if}
					</tbody>
					<tfoot>
						<tr>
							<td colspan="7">
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
