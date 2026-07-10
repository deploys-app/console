<script lang="ts">
	import type { PageData } from './$types'
	import api from '$lib/api'
	import * as format from '$lib/format'
	import * as modal from '$lib/modal'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import WafListModal from '$lib/components/WafListModal.svelte'
	import { getPermissionContext } from '$lib/permission'
	import { registerPageActions } from '$lib/pageactions/store.svelte'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const lists = $derived(data.lists)
	const error = $derived(data.error)

	let listModal = $state<{ open:(list?: Api.WafListItem) => void }>()

	const { can } = getPermissionContext()
	$effect(() => {
		if (!can('wafList.set')) return
		return registerPageActions([{
			id: 'waf-lists:create',
			label: 'New IP list',
			icon: 'fa-plus',
			keywords: 'create new add ip list waf firewall allowlist blocklist',
			run: () => listModal?.open()
		}])
	})

	function reload () {
		api.invalidate('wafList.list')
	}

	function removeList (list: Api.WafListItem) {
		modal.confirm({
			title: `Delete the IP list "${list.name}"? Rules can no longer reference it.`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('wafList.delete', { project, name: list.name }, fetch)
				if (!resp.ok) {
					// An in-use delete is refused server-side with an error naming
					// every referencing rule/limit — surface it verbatim.
					modal.error({ error: resp.error })
					return
				}
				reload()
			}
		})
	}
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/waf?project=${project}`} class="link"><h6>Firewall</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6>IP lists</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div>
		<h4><strong>IP lists</strong></h4>
		<p class="page-sub">
			{lists.length} {lists.length === 1 ? 'list' : 'lists'} — named IP/CIDR sets
			shared by rule conditions and rate-limit filters via
			<code class="font-mono">ipInList(…)</code>. Editing a list re-applies every
			firewall that references it.
		</p>
	</div>
	<GuardedButton permission="wafList.set" class="button is-icon-left" onclick={() => listModal?.open()}>
		<i class="fa-solid fa-plus"></i>
		New list
	</GuardedButton>
</div>

<div class="panel is-level-300">
	<div class="table-container">
		<table class="table is-variant-compact">
			<thead>
				<tr>
					<th>Name</th>
					<th class="is-hide-mobile">Type</th>
					<th>Entries</th>
					<th>Referenced by</th>
					<th class="is-hide-mobile">Updated</th>
					<th class="is-collapse is-align-right"></th>
				</tr>
			</thead>
			<tbody>
				{#each lists as list (list.name)}
					<tr>
						<td>
							<span class="font-mono">{list.name}</span>
							{#if list.description}
								<div class="text-content/50 text-sm mt-0.5">{list.description}</div>
							{/if}
						</td>
						<td class="is-hide-mobile"><span class="font-mono text-sm text-content/60">{list.type}</span></td>
						<td>{list.entries.length}</td>
						<td>
							{#if (list.referencedBy ?? []).length > 0}
								<div class="flex flex-wrap gap-x-3 gap-y-1">
									{#each list.referencedBy as loc (loc)}
										<a class="link font-mono text-sm"
											href={`/waf/manage?project=${project}&location=${encodeURIComponent(loc)}`}>{loc}</a>
									{/each}
								</div>
							{:else}
								<span class="text-content/40">—</span>
							{/if}
						</td>
						<td class="is-hide-mobile">
							<span class="text-content/60 text-sm" title={format.datetime(list.updatedAt)}>
								{format.fromNow(list.updatedAt) || '—'}
							</span>
						</td>
						<td>
							<div class="flex gap-1 justify-end">
								<GuardedButton permission="wafList.set" class="icon-button" aria-label="Edit IP list"
									onclick={() => listModal?.open(list)}>
									<i class="fa-solid fa-pencil"></i>
								</GuardedButton>
								<GuardedButton permission="wafList.delete" class="icon-button" aria-label="Delete IP list"
									onclick={() => removeList(list)}>
									<i class="fa-solid fa-trash-alt"></i>
								</GuardedButton>
							</div>
						</td>
					</tr>
				{/each}
				<NoDataRow
					span={6}
					list={lists}
					icon="fa-list"
					message="No IP lists yet"
					hint="Create a list to reuse the same IPs across firewall rules and rate limits."
					{error} />
				<ErrorRow span={6} {error} />
			</tbody>
		</table>
	</div>
</div>

<WafListModal bind:this={listModal} {project} onsaved={reload} />
