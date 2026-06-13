<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const roles = $derived(data.roles)
	const error = $derived(data.error)

	/**
	 * @param {string} sid
	 */
	function roleCanUpdate (sid) {
		return sid !== 'owner'
	}
</script>

<div class="page-head">
	<div>
		<h4><strong>Roles</strong></h4>
		<p class="page-sub">{roles.length} {roles.length === 1 ? 'role' : 'roles'}</p>
	</div>
	<GuardedButton permission="role.create" class="button is-icon-left" href="/role/create?project={project}">
		<i class="fa-solid fa-plus"></i>
		Create
	</GuardedButton>
</div>
<div class="panel is-level-300">
	<div class="table-container">
		<table class="table is-variant-compact">
			<thead>
			<tr>
				<th>Role</th>
				<th>Name</th>
				<th>Created At</th>
				<th class="is-collapse is-align-right"></th>
			</tr>
			</thead>
			<tbody>
				{#each roles as it (it.role)}
					<tr>
						<td>
							<a href="/role/detail?project={project}&role={it.role}" class="link cell-name">
								{it.role}
							</a>
						</td>
						<td><span class="cell-muted">{it.name}</span></td>
						<td>
							<span class="cell-time" title={format.datetime(it.createdAt)}>{format.fromNow(it.createdAt) || '—'}</span>
						</td>
						<td>
							{#if roleCanUpdate(it.role)}
								<GuardedButton permission="role.create" class="contents" href="/role/create?project={project}&role={it.role}" aria-label="Edit">
									<div class="icon-button">
										<i class="fa-solid fa-pen"></i>
									</div>
								</GuardedButton>
							{:else}
								<!-- Reserve the icon-button's footprint so rows without an
								     edit action keep the same height as the others. -->
								<div class="w-8 h-8" aria-hidden="true"></div>
							{/if}
						</td>
					</tr>
				{/each}
				<NoDataRow span={4} list={roles} />
				<ErrorRow span={4} {error} />
			</tbody>
		</table>
	</div>
</div>
