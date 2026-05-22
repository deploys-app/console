<script>
	import * as format from '$lib/format'
	import { onMount } from 'svelte'
	import { setupCopy } from '$lib/clipboard'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()

	const project = $derived(data.project)
	const repository = $derived(data.repository)
	const tags = $derived(data.tags)
	const error = $derived(data.error)

	onMount(() => {
		return setupCopy('.copy')
	})

	function untagTag (tag) {
		modal.confirm({
			title: `Untag "${tag}"?`,
			yes: 'Untag',
			callback: async () => {
				const resp = await api.invoke('registry/untag', { project, repository: data.id, tag }, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				await api.invalidate('registry/getTags')
			}
		})
	}
</script>

<div class="table-container">
	<table class="table">
		<thead>
		<tr>
			<th>Tag</th>
			<th>Digest</th>
			<th>Created At</th>
			<th class="is-collapse"></th>
		</tr>
		</thead>
		<tbody>
			{#each tags as tag (tag.tag)}
				<tr>
					<td>
						{tag.tag}
						<span class="icon copy" data-clipboard-text="registry.deploys.app/{project}/{repository.name}:{tag.tag}">
							<i class="fa-light fa-copy"></i>
						</span>
					</td>
					<td>
						{format.shortDigest(tag.digest)}
						<span class="icon copy" data-clipboard-text="registry.deploys.app/{project}/{repository.name}@{tag.digest}">
							<i class="fa-light fa-copy"></i>
						</span>
					</td>
					<td>{format.datetime(tag.createdAt)}</td>
					<td>
						<button class="icon-button" aria-label="Untag" onclick={() => untagTag(tag.tag)}>
							<i class="fa-solid fa-trash-alt"></i>
						</button>
					</td>
				</tr>
			{/each}
			<NoDataRow span={4} list={tags} />
			<ErrorRow span={4} {error} />
		</tbody>
	</table>
</div>
