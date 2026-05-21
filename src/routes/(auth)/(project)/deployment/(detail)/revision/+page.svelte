<script>
	import * as format from '$lib/format'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()
	const deployment = $derived(data.deployment)
	const revisions = $derived(data.revisions)

	function rollback (toRevision) {
		modal.confirm({
			title: `Rollback ${deployment.name} to revision ${toRevision}`,
			yes: 'Rollback',
			callback: async () => {
				const resp = await api.invoke('deployment.rollback', {
					project: deployment.project,
					location: deployment.location,
					name: deployment.name,
					revision: toRevision
				}, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				goto(`/deployment/detail?project=${deployment.project}&location=${deployment.location}&name=${deployment.name}`)
			}
		})
	}
</script>

<h6><strong>Revision</strong></h6>
<div class="nm-table-container mt-4 whitespace-nowrap">
	<table class="nm-table is-variant-compact" style="--table-data-border-color: none">
		<thead>
		<tr>
			<th>Revision</th>
			<th>Image</th>
			<th>Deployed At</th>
			<th>Deployed By</th>
			<th class="is-collapse is-align-right"></th>
		</tr>
		</thead>
		<tbody>
		{#each revisions as it, index (it.revision)}
			<tr>
				<td>{it.revision}</td>
				<td>{it.image}</td>
				<td>{format.datetime(it.createdAt)}</td>
				<td>{it.createdBy}</td>
				<td>
					{#if index > 0}
						<button class="nm-button is-size-small" type="button" onclick={() => rollback(it.revision)}>Rollback</button>
					{/if}
				</td>
			</tr>
		{/each}
		</tbody>
	</table>
</div>
