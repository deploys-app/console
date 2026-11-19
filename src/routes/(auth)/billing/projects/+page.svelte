<script lang="ts">
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import * as format from '$lib/format'
	import { canManageBilling } from '$lib/billing'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const account = $derived(data.billingAccount)
	const projects = $derived(data.projects)
	const error = $derived(data.error)
	const canManage = $derived(canManageBilling(account.role))
	const createHref = $derived(`/project/create?billingAccount=${account.id}`)
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
						</tr>
					{/each}
					<NoDataRow
						span={3}
						list={projects}
						{error}
						icon="fa-diagram-project"
						message="No projects are billed to this account."
						hint={canManage ? 'Create a project and attach it to this billing account.' : ''}
						ctaLabel={canManage ? 'New project' : ''}
						ctaHref={canManage ? createHref : ''}
					/>
					<ErrorRow span={3} {error} />
				</tbody>
			</table>
		</div>
	</div>
</div>
