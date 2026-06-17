<script lang="ts">
	import type { PageData } from './$types'
	import * as format from '$lib/format'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import GuardedButton from '$lib/components/GuardedButton.svelte'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const manifests = $derived(data.manifests)
	const error = $derived(data.error)

	function deleteManifest (digest: string) {
		modal.confirm({
			title: `Delete manifest "${format.shortDigest(digest)}"?`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('registry.deleteManifest', { project, repository: data.id, digest }, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				await api.invalidate('registry.getManifests')
			}
		})
	}
</script>

<div class="table-container">
	<table class="table">
		<thead>
		<tr>
			<th>Digest</th>
			<th>Created At</th>
			<th class="is-collapse"></th>
		</tr>
		</thead>
		<tbody>
			{#each manifests as manifest (manifest.digest)}
				<tr>
					<td>{format.shortDigest(manifest.digest)}</td>
					<td>{format.datetime(manifest.createdAt)}</td>
					<td>
						<GuardedButton permission="registry.push" class="icon-button" aria-label="Delete" onclick={() => deleteManifest(manifest.digest)}>
							<i class="fa-solid fa-trash-alt"></i>
						</GuardedButton>
					</td>
				</tr>
			{/each}
			<NoDataRow span={3} list={manifests} />
			<ErrorRow span={3} {error} />
		</tbody>
	</table>
</div>
