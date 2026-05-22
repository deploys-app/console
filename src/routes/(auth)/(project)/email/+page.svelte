<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	const { data } = $props()

	const domains = $derived(data.domains)
	const error = $derived(data.error)
</script>

<h6>Emails</h6>
<br>
<div class="panel is-level-300">
	<div class="flex justify-between items-center">
		<div class="grid grid-flow-col justify-start gap-2 ml-auto">
			Contact us to request access
		</div>
	</div>

	<div class="table-container mt-4">
		<table class="table">
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
