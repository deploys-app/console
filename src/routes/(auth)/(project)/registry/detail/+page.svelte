<script>
	import * as format from '$lib/format'
	import { onMount } from 'svelte'
	import ClipboardJS from 'clipboard'

	export let data

	$: project = data.project
	$: id = data.id
	$: repository = data.repository
	// $: manifests = data.manifests
	$: tags = data.tags

	onMount(() => {
		const copyList = new ClipboardJS('.copy')
		return () => {
			copyList.destroy()
		}
	})
</script>

<div class="nm-breadcrumb">
	<div class="nm-breadcrumb-item">
		<a href={`/registry?project=${project}`} class="nm-link"><h6>Registry</h6></a>
	</div>
	<div class="nm-breadcrumb-item">
		<h6>{repository.name}</h6>
	</div>
</div>

<br>

<div class="nm-panel is-level-300 _dp-g _g-7">
	<div class="lo-12 _g-5">
		<h3 class="_mgr-7 _mgbt-6 _mgbt-0:lg">
			<strong>{repository.name}</strong>
			<div class="_fs-4 _mgt-3 _wb-ba">registry.deploys.app/{project}/{repository.name}</div>
			<div class="_fs-4 _mgt-3 _wb-ba">{format.storage(repository.size)}</div>
		</h3>
	</div>

	<div class="nm-table-container _mgt-6">
		<table class="nm-table">
			<thead>
			<tr>
				<th>Tag</th>
				<th>Digest</th>
				<th>Created At</th>
			</tr>
			</thead>
			<tbody>
			{#each tags as tag}
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
				</tr>
			{/each}
			</tbody>
		</table>
	</div>
</div>