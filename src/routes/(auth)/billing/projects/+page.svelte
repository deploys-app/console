<script lang="ts">
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import * as format from '$lib/format'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import { canManageBilling } from '$lib/billing'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const account = $derived(data.billingAccount)
	const projects = $derived(data.projects)
	const error = $derived(data.error)
	const canManage = $derived(canManageBilling(account.role))
	const createHref = $derived(`/project/create?billingAccount=${account.id}`)
	const columns = $derived(canManage ? 4 : 3)

	let busyProject = $state('')

	function unlink (it: { project: string, name: string }) {
		if (busyProject) return
		modal.confirm({
			title: `Unlink ${it.name}? The project leaves this billing account. Its workloads and scheduled jobs are paused and stay paused until a project owner attaches a new billing account and resumes each resource. Nothing resumes automatically. Disks, databases, and static sites keep running and are not deleted.`,
			yes: 'Unlink',
			callback: async () => {
				busyProject = it.project
				try {
					const resp = await api.invoke('billing.unlinkProject', { id: account.id, project: it.project }, fetch)
					if (!resp.ok) {
						modal.error({ error: resp.error })
						return
					}
					await api.invalidate('billing.listProjects')
				} finally {
					busyProject = ''
				}
			}
		})
	}
</script>

<div class="grid gap-4">
	{#if canManage && projects.length > 0}
		<div class="flex justify-end">
			<a class="button is-size-small is-icon-left" href={createHref}>
				<i class="fa-solid fa-plus"></i>
				New project
			</a>
		</div>
	{/if}

	<div class="panel is-level-300">
		<div class="table-container">
			<table class="table">
				<thead>
					<tr>
						<th>Name</th>
						<th>Project ID</th>
						<th class="is-hide-mobile">Created</th>
						{#if canManage}<th></th>{/if}
					</tr>
				</thead>
				<tbody>
					{#each projects as it (it.id)}
						<tr>
							<td>
								{#if it.canOpen}
									<a class="link" href={`/?project=${it.project}`}>{it.name}</a>
								{:else}
									<span title="You don't have access to this project">{it.name}</span>
								{/if}
							</td>
							<td class="mono">{it.project}</td>
							<td class="is-hide-mobile">{format.datetime(it.createdAt)}</td>
							{#if canManage}
								<td class="text-right">
									<button
										type="button"
										class="button is-variant-tertiary is-size-small"
										aria-label={`Unlink ${it.name}`}
										disabled={busyProject === it.project}
										onclick={() => unlink(it)}
									>Unlink</button>
								</td>
							{/if}
						</tr>
					{/each}
					<NoDataRow
						span={columns}
						list={projects}
						{error}
						icon="fa-diagram-project"
						message="No projects are billed to this account."
						hint={canManage ? 'Create a project and attach it to this billing account.' : ''}
						ctaLabel={canManage ? 'New project' : ''}
						ctaHref={canManage ? createHref : ''}
					/>
					<ErrorRow span={columns} {error} />
				</tbody>
			</table>
		</div>
	</div>
</div>
