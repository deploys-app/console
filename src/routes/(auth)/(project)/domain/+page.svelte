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
			title: `Delete domain "${domain.domain}"?`,
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
<div class="panel is-level-300">
	<div class="flex justify-between items-center">
		<div class="grid grid-flow-col justify-start gap-2 ml-auto">
			<a class="button" href={`/domain/create?project=${project}`}>
				Create
			</a>
		</div>
	</div>

	<div class="table-container mt-4">
		<table class="table is-variant-compact">
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
					{@const dnsHasErrors = !it.cdn && (it.verification?.dns?.errors?.length ?? 0) > 0}
					<tr>
						<td>
							<StatusIcon status={it.cdn && it.verification.ssl.pending ? 'verify' : it.status} />
							<a href={`/domain/detail?project=${project}&domain=${it.domain}`} class="link">{it.domain}</a>
							{#if dnsHasErrors}
								<i class="fa-solid fa-triangle-exclamation text-warning ml-2"
									title="DNS verification is failing. Open the domain to see details."></i>
							{/if}
						</td>
						<td>
							{#if it.wildcard}
								<i class="fa-solid fa-check-circle text-positive text-content/80"></i>
							{:else}
								<i class="fa-solid fa-circle-xmark text-negative text-content/80"></i>
							{/if}
						</td>
						<td>
							{#if it.cdn}
								<i class="fa-solid fa-check-circle text-positive text-content/80"></i>
							{:else}
								<i class="fa-solid fa-circle-xmark text-negative text-content/80"></i>
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
