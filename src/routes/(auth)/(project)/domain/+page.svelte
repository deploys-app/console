<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as modal from '$lib/modal'
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import api from '$lib/api'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const domains = $derived(data.domains)
	const error = $derived(data.error)

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
<div class="nm-panel is-level-300">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _g-4 _mgl-at">
			<a class="nm-button -small" href={`/domain/create?project=${project}`}>
				Create
			</a>
		</div>
	</div>

	<div class="nm-table-container _mgt-6">
		<table class="nm-table is-variant-compact">
			<thead>
			<tr>
				<th>Domain</th>
				<th>Wildcard</th>
				<th>CDN</th>
				<th>Location</th>
<!--				<th>Created at</th>-->
<!--				<th>Created by</th>-->
				<th class="is-collapse is-align-right"></th>
			</tr>
			</thead>
			<tbody>
				{#each domains as it (`${it.domain}-${it.location}`)}
					<tr>
						<td>
							<StatusIcon status={it.verification.ssl.pending ? 'verify' : it.status} />
							<a href={`/domain/detail?project=${project}&domain=${it.domain}`} class="nm-link">{it.domain}</a>
						</td>
						<td>
							{#if it.wildcard}
								<i class="fa-solid fa-check-circle _cl-positive _cl-opacity-80"></i>
							{:else}
								<i class="fa-solid fa-circle-xmark _cl-negative _cl-opacity-80"></i>
							{/if}
						</td>
						<td>
							{#if it.cdn}
								<i class="fa-solid fa-check-circle _cl-positive _cl-opacity-80"></i>
							{:else}
								<i class="fa-solid fa-circle-xmark _cl-negative _cl-opacity-80"></i>
							{/if}
						</td>
						<td>{it.location}</td>
<!--						<td>{format.datetime(it.createdAt)}</td>-->
<!--						<td>{it.createdBy}</td>-->
						<td>
							<button class="icon-button" aria-label="Remove" onclick={() => deleteDomain(it)}>
								<i class="fa-solid fa-trash-alt"></i>
							</button>
						</td>
					</tr>
				{/each}
				<NoDataRow span={5} list={domains} />
				<ErrorRow span={5} {error} />
			</tbody>
		</table>
	</div>
</div>
