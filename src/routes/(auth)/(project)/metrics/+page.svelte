<script>
	import ProjectMetrics from '$lib/components/ProjectMetrics.svelte'

	const { data } = $props()
	const project = $derived(data.project)
</script>

<div class="page-head">
	<div>
		<h4><strong>Metrics</strong></h4>
		<p class="page-sub">Daily project usage — CPU, memory, egress, replicas, and static storage</p>
	</div>
</div>

<ProjectMetrics {project} />
