<script lang="ts">
	import ListTable from '$lib/components/ListTable.svelte'
	import * as modal from '$lib/modal'
	import StatusIcon from '$lib/components/StatusIcon.svelte'
	import api from '$lib/api'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const domains = $derived(data.domains)
	const error = $derived(data.error)

	function deleteDomain (domain: Api.Domain) {
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

<ListTable
	title="Domains"
	items={domains}
	{error}
	noun="domain"
	createPermission="domain.create"
	createHref={`/domain/create?project=${project}`}
	columns={['Domain', 'Location']}
	actions
	key={(it) => `${it.domain}-${it.location}`}>
	{#snippet row(it)}
		{@const dnsHasErrors = (it.verification?.dns?.errors?.length ?? 0) > 0}
		<td>
			<StatusIcon status={it.status} />
			<a href={`/domain/detail?project=${project}&domain=${it.domain}`} class="link cell-name">{it.domain}</a>
			{#if it.wildcard}
				<span class="meta-chip is-accent ml-2" title="Wildcard domain — matches all subdomains">
					<i class="fa-solid fa-asterisk" aria-hidden="true"></i> Wildcard
				</span>
			{/if}
			{#if dnsHasErrors}
				<i class="fa-solid fa-triangle-exclamation text-warning ml-2"
					title="DNS verification is failing. Open the domain to see details."></i>
			{/if}
		</td>
		<td>
			<span class="loc-chip"><i class="fa-solid fa-location-dot" aria-hidden="true"></i>{it.location}</span>
		</td>
		<td>
			<GuardedButton permission="domain.delete" class="icon-button" aria-label="Remove" onclick={() => deleteDomain(it)}>
				<i class="fa-solid fa-trash-alt"></i>
			</GuardedButton>
		</td>
	{/snippet}
</ListTable>
