<script lang="ts">
	import NoDataRow from '$lib/components/NoDataRow.svelte'

	let group = $state<Api.EnvGroup | null>(null)
	let isActive = $state(false)

	const entries = $derived(Object.entries(group?.env ?? {}))

	export function open (g: Api.EnvGroup): void {
		group = g
		isActive = true
	}

	function close () {
		isActive = false
	}
</script>

<div class="modal" onclick={close} class:is-active={isActive} aria-hidden={!isActive}>
	<div class="modal-panel">
		<div class="modal-close" onclick={close} onkeypress={close} tabindex="0" role="button">✕</div>
		<h4><strong>{group?.name}</strong></h4>

		<div class="table-container mt-4">
			<table class="table is-variant-compact">
				<thead>
					<tr>
						<th class="is-collapse" style="min-width: 256px">Key</th>
						<th>Value</th>
					</tr>
				</thead>
				<tbody>
					{#each entries as [k, v] (k)}
						<tr>
							<td>{k}</td>
							<td>{v}</td>
						</tr>
					{/each}
					<NoDataRow span={2} list={entries} />
				</tbody>
			</table>
		</div>
	</div>
</div>

<style>
	.table-container {
		max-height: 405px;
		overflow: auto;
	}

	.modal-panel {
		width: 100%;
		max-width: 48rem;
	}
</style>
