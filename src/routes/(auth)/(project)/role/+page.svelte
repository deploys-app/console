<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

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
	<a class="button is-icon-left" href="/role/create?project={project}">
		<i class="fa-solid fa-plus"></i>
		Create
	</a>
</div>
<div class="panel is-level-300">
	<div class="table-container">
		<table class="table is-variant-compact">
			<thead>
			<tr>
				<th>Role</th>
				<th>Name</th>
				<th>Created At</th>
				<th>Created By</th>
				<th class="is-collapse is-align-right"></th>
			</tr>
			</thead>
			<tbody>
				{#each roles as it (it.role)}
					<tr>
						<td>
							{#if roleCanUpdate(it.role)}
								<a href="/role/create?project={project}&role={it.role}" class="link">
									<strong>{it.role}</strong>
								</a>
							{:else}
								<strong>{it.role}</strong>
							{/if}
						</td>
						<td>{it.name}</td>
						<td>{format.datetime(it.createdAt)}</td>
						<td>{it.createdBy}</td>
						<td>
							{#if roleCanUpdate(it.role)}
								<a href="/role/create?project={project}&role={it.role}" aria-label="Edit">
									<div class="icon-button">
										<i class="fa-solid fa-pen"></i>
									</div>
								</a>
							{/if}
						</td>
					</tr>
				{/each}
				<NoDataRow span={5} list={roles} />
				<ErrorRow span={5} {error} />
			</tbody>
		</table>
	</div>
</div>
