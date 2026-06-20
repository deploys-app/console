<script lang="ts">
	import type { PageData } from './$types'
	import * as format from '$lib/format'
	import { onMount } from 'svelte'
	import { setupCopy } from '$lib/clipboard'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const repository = $derived(data.repository)
	const tags = $derived(data.tags)
	const error = $derived(data.error)

	onMount(() => {
		return setupCopy('.copy')
	})

	function untagTag (tag: string) {
		modal.confirm({
			title: `Untag "${tag}"?`,
			yes: 'Untag',
			callback: async () => {
				const resp = await api.invoke('registry.untag', { project, repository: data.id, tag }, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				await api.invalidate('registry.getTags')
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
			<th class="is-align-right">Size</th>
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
					<td class="is-align-right">{format.storage(tag.size)}</td>
					<td>{format.datetime(tag.createdAt)}</td>
					<td>
						<GuardedButton permission="registry.push" class="icon-button" aria-label="Untag" onclick={() => untagTag(tag.tag)}>
							<i class="fa-solid fa-trash-alt"></i>
						</GuardedButton>
					</td>
				</tr>
			{/each}
			<NoDataRow span={5} list={tags} />
			<ErrorRow span={5} {error} />
		</tbody>
	</table>
</div>
