<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const firewalls = $derived(data.firewalls)
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
							{#if fw.description}
								{fw.description}
							{:else}
								<span class="text-content/40">—</span>
							{/if}
						</td>
						<td>{fw.ruleCount}</td>
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
					span={4}
					list={firewalls}
					icon="fa-shield-halved"
					message="No firewalls yet"
					hint="Create a firewall to start filtering traffic in a location."
					ctaLabel="Create firewall"
					ctaHref={`/waf/create?project=${project}`} />
			</tbody>
		</table>
	</div>
</div>
