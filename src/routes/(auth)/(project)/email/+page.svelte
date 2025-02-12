<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	let { data } = $props()

	let domains = $derived(data.domains)
	let error = $derived(data.error)
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
				{#each domains as it (it.domain)}
					<tr>
						<td>{it.domain}</td>
						<td>-</td>
						<td>{format.datetime(it.createdAt)}</td>
					</tr>
				{/each}
				<NoDataRow span={3} list={domains} />
				<ErrorRow span={3} {error} />
			</tbody>
		</table>
	</div>
</div>
