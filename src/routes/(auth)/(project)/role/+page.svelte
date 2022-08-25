<script>
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import format from '$lib/format'
	import { loading } from '$lib/stores'

	export let data
	$: ({
		project,
		permission,
		roles
	} = data)

	function roleCanUpdate (sid) {
		return sid !== 'owner'
	}
</script>

<h6>Roles</h6>
<br>
<div class="panel">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			<a class="button -small" href={`/role/create?project=${project}`}>
                Create
            </a>
		</div>
	</div>

	<div class="table-container">
		<table class="table -ruled">
			<thead>
			<tr>
				<th>Role</th>
				<th>Name</th>
				<th>Created At</th>
				<th>Created By</th>
				<th class="collapsed _tal-r"></th>
			</tr>
			</thead>
			<tbody>
			{#if $loading}
				<LoadingRow span="5" />
			{:else}
				{#each roles as it}
					<tr>
						<td>
							{#if roleCanUpdate(it.role)}
								<a href={`/role/create?project=${project}&role=${it.role}`} class="link">
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
							<div class="table-action-container">
								{#if roleCanUpdate(it.role)}
									<a href={`/role/create?project=${project}&role=${it.role}`}>
										<div class="icon-button -secondary">
											<i class="fa-solid fa-pen"></i>
										</div>
									</a>
								{/if}
							</div>
						</td>
					</tr>
				{:else}
					<NoDataRow span="5" forbidden={!permission.roles} />
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>
