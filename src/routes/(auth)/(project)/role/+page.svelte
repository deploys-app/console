<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import ErrorRow from '$lib/components/ErrorRow.svelte'

	export let data

	$: project = data.project
	$: roles = data.roles
	$: error = data.error

	/**
	 * @param {string} sid
	 */
	function roleCanUpdate (sid) {
		return sid !== 'owner'
	}
</script>

<h6>Roles</h6>
<br>
<div class="nm-panel is-level-300">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _g-4 _mgl-at">
			<a class="nm-button" href="/role/create?project={project}">
                Create
            </a>
		</div>
	</div>

	<div class="nm-table-container _mgt-6">
		<table class="nm-table is-variant-compact">
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
								<a href="/role/create?project={project}&role={it.role}" class="nm-link">
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
								<a href="/role/create?project={project}&role={it.role}">
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
