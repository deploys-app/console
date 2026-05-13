<script>
	import * as format from '$lib/format'
	import { page } from '$app/stores'

	const { data, children } = $props()

	const project = $derived(data.project)
	const repository = $derived(data.repository)
	const id = $derived(data.id)
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

	<hr>

	<div class="nm-tabs is-variant-underline _mgbt-0:lg _w-100pct _fdrt-cl _fdrt-r:md">
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
