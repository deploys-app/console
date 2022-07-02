<script context="module">
	import api from '$lib/api'

	export async function load ({ stuff, fetch }) {
		const { project } = stuff

		const [domains, projectInfo] = await Promise.all([
			api.invoke('domain.list', { project }, fetch),
			api.invoke('project.get', { project }, fetch)
		])
		if (!domains.ok && !domains.error.forbidden) {
			return {
				status: 500,
				error: `domains: ${domains.error.message}`
			}
		}
		if (!projectInfo.ok) {
			return {
				status: 500,
				error: `project: ${project.error.message}`
			}
		}

		return {
			props: {
				permission: {
					domains: !domains.error?.forbidden
				},
				domains: domains.result,
				projectInfo: projectInfo.result
			}
		}
	}
</script>

<script>
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import { page } from '$app/stores'
	import { loading } from '$lib/stores'
	import modal from '$lib/modal'
	import format from '$lib/format'
	import StatusIcon from '$lib/components/StatusIcon.svelte'

	export let permission
	export let domains
	export let projectInfo

	$: project = $page.stuff.project

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
				<th>Type</th>
				<th>Location</th>
<!--				<th>Created at</th>-->
<!--				<th>Created by</th>-->
				<th></th>
			</tr>
			</thead>
			<tbody>
			{#if $loading}
				<LoadingRow span="4" />
			{:else}
				{#each domains?.items || [] as it}
					<tr>
						<td>
							<StatusIcon status={it.status} />
							<a sveltekit:prefetch href={`/domain/detail?project=${project}&domain=${it.domain}`} class="link">{it.domain}</a>
						</td>
						<td>
							{format.domainType(it.type)}
							{#if !projectInfo.config.domainCloudflare && it.type === 'cloudflare'}
								<i class="fa-solid fa-triangle-exclamation _cl-negative-500"></i>
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
					<NoDataRow span="4" forbidden={!permission.domains} />
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>
