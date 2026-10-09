<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import type { PageData } from './$types'
	import ProjectMetrics from '$lib/components/ProjectMetrics.svelte'
	import ProjectMetricsByDeployment from '$lib/components/ProjectMetricsByDeployment.svelte'

	const { data }: { data: PageData } = $props()
	const project = $derived(data.project)
	const tab = $derived($page.url.searchParams.get('tab') === 'deployment' ? 'deployment' : 'project')

	function tabHref (value: string): string {
		const u = new URL($page.url)
		if (value === 'deployment') u.searchParams.set('tab', 'deployment')
		else u.searchParams.delete('tab')
		return `${u.pathname}${u.search}`
	}
</script>

<div class="page-head">
	<div>
		<h4><strong>Metrics</strong></h4>
		<p class="page-sub">
			{#if tab === 'deployment'}
				Daily usage grouped by deployment
			{:else}
				Daily project usage — CPU, memory, egress, replicas, and static storage
			{/if}
		</p>
	</div>
</div>

<div class="select lg:hidden mb-4">
	<select
		aria-label="Metrics view"
		value={tab}
		onchange={(e) => goto(tabHref((e.currentTarget as HTMLSelectElement).value))}
	>
		<option value="project">Project</option>
		<option value="deployment">By deployment</option>
	</select>
</div>
<div class="tabs is-variant-underline w-full max-lg:hidden mb-4">
	<a class="tab-button" class:is-active={tab === 'project'} href={tabHref('project')}>Project</a>
	<a class="tab-button" class:is-active={tab === 'deployment'} href={tabHref('deployment')}>By deployment</a>
</div>

{#if tab === 'deployment'}
	<ProjectMetricsByDeployment {project} />
{:else}
	<ProjectMetrics {project} />
{/if}
