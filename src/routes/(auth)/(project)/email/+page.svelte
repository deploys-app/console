<script>
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	export let data
</script>

<h6>Emails</h6>
<br>
<div class="nm-panel is-level-300">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _g-4 _mgl-at">
			Contact us to request access
		</div>
	</div>

	<div class="nm-table-container _mgt-6">
		<table class="nm-table">
			<thead>
			<tr>
				<th>Domain</th>
				<th>Quota</th>
				<th>Created at</th>
			</tr>
			</thead>
			<tbody>
				{#await data.domains}
					<LoadingRow span={3} />
				{:then res}
					{#if res.ok}
						{#each res.result.items ?? [] as it}
							<tr>
								<td>{it.domain}</td>
								<td>-</td>
								<td>{format.datetime(it.createdAt)}</td>
							</tr>
						{:else}
							<NoDataRow span={3} />
						{/each}
					{:else}
						<ErrorRow span={3} error={res.error} />
					{/if}
				{:catch error}
					<ErrorRow span={3} error={error} />
				{/await}
			</tbody>
		</table>
	</div>
</div>
