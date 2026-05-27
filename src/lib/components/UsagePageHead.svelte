<script>
	import { page } from '$app/stores'

	/**
	 * Page head for a project resource list that toggles between the list view
	 * and its daily-usage view (Registry, Dropbox). Renders the title/subtitle
	 * plus a context-aware button: "Usage" on the list view, and a back button
	 * to the list on the usage view.
	 *
	 * @typedef {Object} Props
	 * @property {string} title
	 * @property {string} subtitle
	 * @property {string} basePath   list route, e.g. '/registry'
	 * @property {string} listLabel  back-button label, e.g. 'Repositories'
	 * @property {string} project
	 */

	/** @type {Props} */
	const { title, subtitle, basePath, listLabel, project } = $props()

	const onUsage = $derived($page.url.pathname === `${basePath}/usage`)
</script>

<div class="page-head">
	<div>
		<h4><strong>{title}</strong></h4>
		<p class="page-sub">{subtitle}</p>
	</div>
	{#if onUsage}
		<a class="button is-variant-secondary is-icon-left" href={`${basePath}?project=${project}`}>
			<i class="fa-solid fa-arrow-left"></i>
			{listLabel}
		</a>
	{:else}
		<a class="button is-variant-secondary is-icon-left" href={`${basePath}/usage?project=${project}`}>
			<i class="fa-solid fa-chart-line"></i>
			Usage
		</a>
	{/if}
</div>
