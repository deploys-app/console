<script>
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import { loading } from '$lib/stores'
	import * as modal from '$lib/modal'
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import api from '$lib/api'

	export let data

	$: project = data.project
	$: permission = data.permission
	$: domains = data.domains
	$: projectInfo = data.projectInfo

	function deleteDomain (domain) {
		modal.confirm({
			title: `Delete domain "${domain.domain}" ?`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('domain.delete', {
					project,
					domain: domain.domain
				}, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				api.invalidate('domain.list')
			}
		})
	}
</script>

<h6>Domains</h6>
<br>
<div class="panel">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			<a class="button -small" href={`/domain/create?project=${project}`}>
				Create
			</a>
		</div>
	</div>

	<div class="table-container">
		<table class="table -ruled">
			<thead>
			<tr>
				<th>Domain</th>
				<th>Wildcard</th>
				<th>CDN</th>
				<th>Location</th>
<!--				<th>Created at</th>-->
<!--				<th>Created by</th>-->
				<th></th>
			</tr>
			</thead>
			<tbody>
			{#if $loading}
				<LoadingRow span={5} />
			{:else}
				{#each domains as it}
					<tr>
						<td>
							<StatusIcon status={it.verification.ssl.pending ? 'verify' : it.status} />
							<a href={`/domain/detail?project=${project}&domain=${it.domain}`} class="link">{it.domain}</a>
						</td>
						<td>
							{#if it.wildcard}
								<i class="fa-solid fa-check-circle _cl-positive-500"></i>
							{:else}
								<i class="fa-solid fa-circle-xmark _cl-negative-500"></i>
							{/if}
						</td>
						<td>
							{#if it.cdn}
								<i class="fa-solid fa-check-circle _cl-positive-500"></i>
							{:else}
								<i class="fa-solid fa-circle-xmark _cl-negative-500"></i>
							{/if}
						</td>
						<td>{it.location}</td>
<!--						<td>{format.datetime(it.createdAt)}</td>-->
<!--						<td>{it.createdBy}</td>-->
						<td>
							<button class="icon-button -negative" on:click={() => deleteDomain(it)}>
								<i class="fa-solid fa-trash-alt"></i>
							</button>
						</td>
					</tr>
				{:else}
					<NoDataRow span={5} forbidden={!permission.domains} />
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>
