<script>
	import { page } from '$app/stores'

	/**
	 * Shared sub-navigation for the GitHub feature. Repositories is the
	 * overview/management view; Workflow is the standalone generator.
	 *
	 * @typedef {Object} Props
	 * @property {string | null} project
	 */

	/** @type {Props} */
	const { project } = $props()

	const onWorkflow = $derived($page.url.pathname.startsWith('/github/workflow'))
	const q = $derived(project ? `?project=${project}` : '')
</script>

<nav class="tabs is-variant-underline github-nav" aria-label="GitHub sections">
	<a class="tab-button" class:is-active={!onWorkflow} href={`/github${q}`} aria-current={!onWorkflow ? 'page' : undefined}>
		<i class="fa-solid fa-book-bookmark mr-2"></i>Repositories
	</a>
	<a class="tab-button" class:is-active={onWorkflow} href={`/github/workflow${q}`} aria-current={onWorkflow ? 'page' : undefined}>
		<i class="fa-solid fa-diagram-project mr-2"></i>Workflow
	</a>
</nav>

<style>
	/* A full-width hairline baseline turns the per-tab underlines into a proper
	 * tab bar. The active tab's primary 2px rule overlays this 1px line. */
	.github-nav {
		position: relative;
		margin-bottom: 1.5rem;
	}

	.github-nav::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 1px;
		background: hsl(var(--hsl-line));
	}
</style>
