<script>
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import { loading } from '$lib/stores'
	import * as format from '$lib/format'

	export let data

	$: project = data.project
	$: permission = data.permission
	$: emails = data.emails
</script>

<h6>Emails</h6>
<br>
<div class="panel">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _g-4 _mgl-at">
			Contact us to request access
		</div>
	</div>

	<div class="nm-table-container _mgt-6">
		<table class="table -ruled">
			<thead>
			<tr>
				<th>Domain</th>
				<th>Quota</th>
				<th>Created at</th>
			</tr>
			</thead>
			<tbody>
			{#if $loading}
				<LoadingRow span={3} />
			{:else}
				{#each emails as it}
					<tr>
						<td>{it.domain}</td>
						<td>-</td>
						<td>{format.datetime(it.createdAt)}</td>
					</tr>
				{:else}
					<NoDataRow span={3} forbidden={!permission.emails} />
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>
