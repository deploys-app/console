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

<div class="page-head">
	<div class="min-w-0">
		<h4 class="min-w-0"><strong class="wrap-anywhere">{repository.name}</strong></h4>
		<p class="page-sub font-mono min-w-0 wrap-anywhere">registry.deploys.app/{project}/{repository.name}</p>
	</div>
	<div class="page-sub">{format.storage(repository.size)}</div>
</div>

<div class="panel is-level-300 grid gap-6">
	<div class="tabs is-variant-underline w-full flex-col lg:flex-row">
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
