<script lang="ts">
	import { getContext } from 'svelte'
	import type { PageData } from './$types'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import { denyTooltip } from '$lib/permission'

	const { can } = getContext('permission') as { can: (p: string) => boolean }

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const envGroups = $derived(data.envGroups)
	const error = $derived(data.error)
</script>

<div class="page-head">
	<div>
		<h4><strong>Env Groups</strong></h4>
		<p class="page-sub">{envGroups.length} {envGroups.length === 1 ? 'env group' : 'env groups'}</p>
	</div>
	<GuardedButton permission="envgroup.create" class="button is-icon-left" href="/env-group/create?project={project}">
		<i class="fa-solid fa-plus"></i>
		Create
	</GuardedButton>
</div>
<div class="panel is-level-300">
	<div class="table-container">
		<table class="table is-variant-compact">
			<thead>
			<tr>
				<th>Name</th>
				<th>Variables</th>
				<th>Created at</th>
				<th class="is-collapse is-align-right"></th>
			</tr>
			</thead>
			<tbody>
				{#each envGroups as it (it.name)}
					<tr>
						<td>
							<a class="link cell-name" href="/env-group/detail?project={project}&name={it.name}">
								{it.name}
							</a>
						</td>
						<td><span class="count-pill"><i class="fa-solid fa-list" aria-hidden="true"></i>{Object.keys(it.env ?? {}).length}</span></td>
						<td>
							<span class="cell-time" title={format.datetime(it.createdAt)}>{format.fromNow(it.createdAt) || '—'}</span>
						</td>
						<td>
							<span class="inline-flex" title={can('envgroup.update') ? null : denyTooltip('envgroup.update')}>
								<a
									href={can('envgroup.update') ? `/env-group/create?project=${project}&name=${it.name}` : null}
									aria-label="Edit"
									aria-disabled={can('envgroup.update') ? null : 'true'}>
									<div class="icon-button">
										<i class="fa-solid fa-pen"></i>
									</div>
								</a>
							</span>
						</td>
					</tr>
				{/each}
				<NoDataRow span={4} list={envGroups} />
				<ErrorRow span={4} {error} />
			</tbody>
		</table>
	</div>
</div>
