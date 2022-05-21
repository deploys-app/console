<script context="module">
	import api from '$lib/api'

	export async function load ({ stuff, fetch }) {
		const { project } = stuff
		const serviceAccounts = await api.invoke('serviceAccount.list', { project }, fetch)
		if (!serviceAccounts.ok && !serviceAccounts.error.forbidden) {
			return {
				status: 500,
				error: `serviceAccounts: ${serviceAccounts.error.message}`
			}
		}
		return {
			props: {
				permission: {
					serviceAccounts: !serviceAccounts.error?.forbidden
				},
				serviceAccounts: serviceAccounts.result?.serviceAccounts || []
			}
		}
	}
</script>

<script>
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import format from '$lib/format'
	import { page } from '$app/stores'
	import { loading } from '$lib/stores'

	export let permission
	export let serviceAccounts

	$: project = $page.stuff.project
</script>

<h6>Service Accounts</h6>
<br>
<div class="moon-panel">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			<a class="moon-button -small" href={`/service-account/create?project=${project}`}>
				Create
			</a>
		</div>
	</div>

	<div class="moon-table-container">
		<table class="moon-table -ruled">
			<thead>
			<tr>
				<th>Email</th>
				<th>Name</th>
				<th>Created At</th>
				<th class="collapsed _tal-r"></th>
			</tr>
			</thead>
			<tbody>
			{#if $loading}
				<LoadingRow span="4" />
			{:else}
				{#each serviceAccounts as it}
					<tr>
						<td>
							<a class="moon-link" href={`/service-account/detail?project=${project}&id=${it.sid}`}>
								{it.email}
							</a>
						</td>
						<td>{it.name}</td>
						<td>{format.datetime(it.createdAt)}</td>
						<td>
							<div class="table-action-container">
								<a href={`/service-account/create?project=${project}&id=${it.sid}`}>
									<div class="moon-icon-button -secondary">
										<i class="fas fa-pen"></i>
									</div>
								</a>
							</div>
						</td>
					</tr>
				{:else}
					<NoDataRow span="4" forbidden={!permission.serviceAccounts} />
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>
