<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import { onMount } from 'svelte'
	import api from '$lib/api'

	const { data } = $props()

	const project = $derived(data.project)
	const firewalls = $derived(data.firewalls)
	const error = $derived(data.error)

	const hasPending = $derived(firewalls.some((/** @type {Api.WafZone} */ fw) => fw.status === 'pending'))

	// While any zone is still being applied/removed by the deployer, poll waf.list
	// so the spinner resolves to its settled state on its own. Mirrors the
	// deployment detail polling pattern (api.intervalInvalidate in onMount).
	onMount(() => api.intervalInvalidate(async () => {
		if (!hasPending) return
		await api.invalidate('waf.list')
	}, 3000))
</script>

<div class="page-head">
	<div>
		<h4><strong>Firewall</strong></h4>
		<p class="page-sub">
			{firewalls.length} {firewalls.length === 1 ? 'firewall' : 'firewalls'}
		</p>
	</div>
	<a class="button is-icon-left" href={`/waf/create?project=${project}`}>
		<i class="fa-solid fa-plus"></i>
		Create firewall
	</a>
</div>

<div class="panel is-level-300">
	<div class="table-container">
		<table class="table is-variant-compact">
			<thead>
				<tr>
					<th>Location</th>
					<th>Status</th>
					<th>Description</th>
					<th>Rules</th>
					<th class="is-collapse is-align-right"></th>
				</tr>
			</thead>
			<tbody>
				{#each firewalls as fw (fw.location)}
					<tr>
						<td>
							<a href={`/waf/manage?project=${project}&location=${encodeURIComponent(fw.location)}`} class="link font-mono">{fw.location}</a>
						</td>
						<td>
							{#if fw.status === 'pending'}
								<span class="inline-flex items-center gap-2 text-content/70">
									<i class="fa-solid fa-spinner-third fa-spin"></i>
									{fw.action === 'delete' ? 'Removing' : 'Deploying'}
								</span>
							{:else if fw.status === 'error'}
								<span class="inline-flex items-center gap-2 text-negative/80">
									<i class="fa-solid fa-times"></i>
									Error
								</span>
							{:else}
								<span class="inline-flex items-center gap-2 text-positive/80">
									<i class="fa-solid fa-check-circle"></i>
									Active
								</span>
							{/if}
						</td>
						<td>
							{#if fw.description}
								{fw.description}
							{:else}
								<span class="text-content/40">—</span>
							{/if}
						</td>
						<td>{fw.rules?.length ?? 0}</td>
						<td>
							<div class="flex gap-1 justify-end">
								<a class="button is-variant-secondary is-size-small"
									href={`/waf/manage?project=${project}&location=${encodeURIComponent(fw.location)}`}>
									Manage
								</a>
							</div>
						</td>
					</tr>
				{/each}
				<NoDataRow
					span={5}
					list={firewalls}
					icon="fa-shield-halved"
					message="No firewalls yet"
					hint="Create a firewall to start filtering traffic in a location."
					ctaLabel="Create firewall"
					ctaHref={`/waf/create?project=${project}`} />
				<ErrorRow span={5} {error} />
			</tbody>
		</table>
	</div>
</div>
