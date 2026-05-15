<script>
	import { untrack } from 'svelte'
	import { SvelteURLSearchParams } from 'svelte/reactivity'
	import { goto } from '$app/navigation'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import * as format from '$lib/format'

	const { data } = $props()

	const project = $derived(data.project)
	const items = $derived(data.items)
	const error = $derived(data.error)

	const form = $state(untrack(() => ({ ...data.filters })))

	/**
	 * @param {Event} e
	 */
	async function apply (e) {
		e.preventDefault()
		const q = new SvelteURLSearchParams()
		q.set('project', project)
		if (form.resourceType) q.set('resourceType', form.resourceType)
		if (form.actor) q.set('actor', form.actor)
		if (form.outcome) q.set('outcome', form.outcome)
		if (form.after) q.set('after', form.after)
		if (form.before) q.set('before', form.before)
		if (form.limit && form.limit !== 50) q.set('limit', String(form.limit))
		await goto(`/audit-log?${q.toString()}`, { keepFocus: true })
	}

	function reset () {
		form.resourceType = ''
		form.actor = ''
		form.outcome = ''
		form.after = ''
		form.before = ''
		form.limit = 50
		goto(`/audit-log?project=${project}`, { keepFocus: true })
	}

	/**
	 * @param {Api.AuditOutcome} o
	 */
	function outcomeIcon (o) {
		if (o === 'success') return { icon: 'fa-circle-check', cls: '_cl-positive', title: 'Success' }
		if (o === 'failure') return { icon: 'fa-circle-xmark', cls: '_cl-negative', title: 'Failure' }
		return { icon: 'fa-circle', cls: '', title: o }
	}
</script>

<h6>Audit Logs</h6>
<br>
<div class="nm-panel is-level-300">
	<form class="lo-grid _g-5" onsubmit={apply}>
		<div class="lo-12 lo-6:md lo-4:lg _g-5">
			<div class="nm-field">
				<label class="nm-label" for="filter-resource-type">Resource type</label>
				<div class="nm-input">
					<input id="filter-resource-type" type="text" placeholder="e.g. deployment"
						bind:value={form.resourceType}>
				</div>
			</div>
		</div>
		<div class="lo-12 lo-6:md lo-4:lg _g-5">
			<div class="nm-field">
				<label class="nm-label" for="filter-actor">Actor</label>
				<div class="nm-input">
					<input id="filter-actor" type="text" placeholder="email or service account"
						bind:value={form.actor}>
				</div>
			</div>
		</div>
		<div class="lo-12 lo-6:md lo-4:lg _g-5">
			<div class="nm-field">
				<label class="nm-label" for="filter-outcome">Outcome</label>
				<div class="nm-select">
					<select id="filter-outcome" bind:value={form.outcome}>
						<option value="">All</option>
						<option value="success">Success</option>
						<option value="failure">Failure</option>
					</select>
				</div>
			</div>
		</div>
		<div class="lo-12 lo-6:md lo-4:lg _g-5">
			<div class="nm-field">
				<label class="nm-label" for="filter-after">After</label>
				<div class="nm-input">
					<input id="filter-after" type="datetime-local" bind:value={form.after}>
				</div>
			</div>
		</div>
		<div class="lo-12 lo-6:md lo-4:lg _g-5">
			<div class="nm-field">
				<label class="nm-label" for="filter-before">Before</label>
				<div class="nm-input">
					<input id="filter-before" type="datetime-local" bind:value={form.before}>
				</div>
			</div>
		</div>
		<div class="lo-12 lo-6:md lo-4:lg _g-5">
			<div class="nm-field">
				<label class="nm-label" for="filter-limit">Limit</label>
				<div class="nm-input">
					<input id="filter-limit" type="number" min="1" max="100"
						bind:value={form.limit}>
				</div>
			</div>
		</div>
		<div class="lo-12 _dp-f _jtfct-fe _g-4">
			<button type="button" class="nm-button is-variant-ghost" onclick={reset}>Reset</button>
			<button type="submit" class="nm-button">Apply</button>
		</div>
	</form>

	<div class="nm-table-container _mgt-6">
		<table class="nm-table is-variant-compact">
			<thead>
				<tr>
					<th>Time</th>
					<th>Outcome</th>
					<th>Actor</th>
					<th>Action</th>
					<th>Resource</th>
					<th>Detail</th>
				</tr>
			</thead>
			<tbody>
				{#each items as it (it.id)}
					{@const o = outcomeIcon(it.outcome)}
					<tr>
						<td>{format.datetime(it.createdAt)}</td>
						<td>
							<i class="fa-solid {o.icon} {o.cls}" title={o.title}></i>
							{o.title}
						</td>
						<td>
							{it.actor.email}
							{#if it.actor.type === 'ServiceAccount'}
								<small class="_cl-content-2">(service account)</small>
							{/if}
						</td>
						<td><code>{it.action}</code></td>
						<td>
							{#if it.resource.type}
								<strong>{it.resource.type}</strong>
								{#if it.resource.name}
									/ {it.resource.name}
								{/if}
								{#if it.resource.locationId}
									<small class="_cl-content-2">@ {it.resource.locationId}</small>
								{/if}
							{/if}
						</td>
						<td>
							{#if it.detail}
								<span class="_cl-content-2">{it.detail}</span>
							{/if}
						</td>
					</tr>
				{/each}
				<NoDataRow span={6} list={items} />
				<ErrorRow span={6} {error} />
			</tbody>
		</table>
	</div>
</div>
