<script>
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import { projects } from '$lib/stores'
</script>

<h6>Projects</h6>
<br>
<div class="moon-panel">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			<a class="moon-button -small" href="/project/create">
                Create
            </a>
		</div>
	</div>

	<div class="moon-table-container">
		<table class="moon-table -ruled">
			<thead>
			<tr>
				<th>Name</th>
				<th>ID</th>
				<th>Number</th>
				<th class="collapse _tal-r"></th>
			</tr>
			</thead>
			<tbody>
			{#each $projects as it}
				<tr>
					<td>
						<a href={`/?project=${it.project}`} class="moon-link">
							<strong>{it.name}</strong>
						</a>
					</td>
					<td>{it.project}</td>
					<td>{it.id}</td>
					<td class="table-action-container">
						<a href={`/project/create?project=${it.project}`}>
							<div class="moon-icon-button -secondary">
								<i class="fas fa-pen"></i>
							</div>
						</a>
<!--						<form method="POST" action="{{route "project.delete"}}" x-data>-->
<!--								<input type="hidden" name="id" value="{{.ID}}">-->
<!--						<button-->
<!--							class="moon-icon-button -negative" x-ref="button" data-title="{{.Name}}"-->
<!--							data-projectid="{{.Project}}"-->
<!--							@click.prevent="Spruce.emit('confirm', {-->
<!--										title: 'Remove project ' + $refs.button.dataset.title,-->
<!--										projectId: $refs.button.dataset.projectid,-->
<!--										ok: 'Remove',-->
<!--										okClass: '-negative',-->
<!--										fn: () => $el.submit()-->
<!--									})">-->
<!--							<i class="fas fa-trash-alt"></i>-->
<!--						</button>-->
<!--						</form>-->
					</td>
				</tr>
			{:else}
				<NoDataRow span="4" />
			{/each}
			</tbody>
		</table>
	</div>
</div>
