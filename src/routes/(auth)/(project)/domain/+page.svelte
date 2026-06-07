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

<style>
	/* Wildcard pill — mirrors the "Type" chip on the domain detail page.
	   Only wildcard domains get a badge; standard domains stay clean. */
	.wildcard-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		margin-left: 0.5rem;
		padding: 0.08rem 0.45rem;
		border-radius: 5px;
		font-size: 0.7rem;
		font-weight: 600;
		line-height: 1.4;
		vertical-align: middle;
		background: hsl(var(--hsl-primary) / 0.12);
		color: hsl(var(--hsl-primary));
	}
	.wildcard-tag i { font-size: 0.62rem; }
</style>

<div class="page-head">
	<div>
		<h4><strong>Domains</strong></h4>
		<p class="page-sub">{domains.length} {domains.length === 1 ? 'domain' : 'domains'}</p>
	</div>
	<a class="button is-icon-left" href={`/domain/create?project=${project}`}>
		<i class="fa-solid fa-plus"></i>
		Create
	</a>
</div>
<div class="panel is-level-300">
	<div class="table-container">
		<table class="table is-variant-compact">
			<thead>
			<tr>
				<th>Domain</th>
				<th>Location</th>
<!--				<th>Created at</th>-->
<!--				<th>Created by</th>-->
				<th class="is-collapse is-align-right"></th>
			</tr>
			</thead>
			<tbody>
				{#each domains as it (`${it.domain}-${it.location}`)}
					{@const dnsHasErrors = (it.verification?.dns?.errors?.length ?? 0) > 0}
					<tr>
						<td>
							<StatusIcon status={it.status} />
							<a href={`/domain/detail?project=${project}&domain=${it.domain}`} class="link">{it.domain}</a>
							{#if it.wildcard}
								<span class="wildcard-tag" title="Wildcard domain — matches all subdomains">
									<i class="fa-solid fa-asterisk"></i> Wildcard
								</span>
							{/if}
							{#if dnsHasErrors}
								<i class="fa-solid fa-triangle-exclamation text-warning ml-2"
									title="DNS verification is failing. Open the domain to see details."></i>
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
				<NoDataRow span={3} list={domains} />
				<ErrorRow span={3} {error} />
			</tbody>
		</table>
	</div>
</div>
