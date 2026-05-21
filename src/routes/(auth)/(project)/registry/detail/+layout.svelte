<script>
	import * as format from '$lib/format'
	import { page } from '$app/stores'

	const { data, children } = $props()

	const project = $derived(data.project)
	const repository = $derived(data.repository)
	const id = $derived(data.id)
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/registry?project=${project}`} class="link"><h6>Registry</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6>{repository.name}</h6>
	</div>
</div>

<br>

<div class="panel is-level-300 grid gap-6">
	<div class="grid grid-cols-1 gap-3">
		<h3 class="mr-6 mb-4 xl:mb-0">
			<strong>{repository.name}</strong>
			<div class="text-base mt-1 break-all">registry.deploys.app/{project}/{repository.name}</div>
			<div class="text-base mt-1 break-all">{format.storage(repository.size)}</div>
		</h3>
	</div>

	<hr>

	<div class="tabs is-variant-underline xl:mb-0 w-full flex-col lg:flex-row">
		<a class="tab-button"
			class:is-active={$page.url.pathname === '/registry/detail/tags'}
			href={`/registry/detail/tags?project=${project}&repository=${id}`}>
			Tags
		</a>
		<a class="tab-button"
			class:is-active={$page.url.pathname === '/registry/detail/manifests'}
			href={`/registry/detail/manifests?project=${project}&repository=${id}`}>
			Manifests
		</a>
	</div>

	{@render children?.()}
</div>
