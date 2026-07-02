<script lang="ts">
	import type { LayoutData } from './$types'
	import type { Snippet } from 'svelte'
	import '$style/app.css'
	import { page } from '$app/stores'
	import api from '$lib/api'
	import { onMount } from 'svelte'
	import Navbar from './Navbar.svelte'
	import Sidebar from './Sidebar.svelte'
	import ModalSelectProject from './ModalSelectProject.svelte'
	import SearchModal from './SearchModal.svelte'
	import Modal from '$lib/modal/Modal.svelte'

	const { data, children }: { data: LayoutData, children: Snippet } = $props()

	const profile = $derived(data.profile)
	const projects = $derived(data.projects ?? [])

	// The global search palette is project-scoped — only enabled when a
	// `?project=` is selected. On `/project` (the project picker page) the page
	// itself owns the `/` shortcut for its own ModalSelectProject.
	const hasProject = $derived(!!$page.url.searchParams.get('project'))

	let showSidebar = $state(false)
	$effect(() => {
		$page
		showSidebar = false
	})

	let projectModal = $state<ModalSelectProject | null>(null)

	let searchModal = $state<SearchModal | null>(null)

	onMount(() => {
		api.setOnUnauth(() => {
			location.reload()
		})
	})

	function hideSidebar () {
		showSidebar = false
	}

	/**
	 * Open the search palette on "/", unless the user is typing into a field
	 * (including the palette's own input, so "/" types normally once it's open).
	 */
	function onWindowKeydown (e: KeyboardEvent) {
		if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
		if (!hasProject) return
		const el = e.target as HTMLElement | null
		const tag = el?.tagName
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return
		e.preventDefault()
		searchModal?.open()
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

<div class="app-layout"
	class:is-shown-sidebar={showSidebar}>
	<div class="navbar-wrapper">
		<Navbar {profile} toggleSidebar={() => showSidebar = !showSidebar} openSearch={hasProject ? () => searchModal?.open() : undefined} />
	</div>

	<div class="sidebar-wrapper z-[2]">
		<div class="sidebar-backdrop" role="button" tabindex="0"
			onclick={hideSidebar} onkeypress={hideSidebar}></div>
		<Sidebar {projects} openProjectModal={() => projectModal?.open()} />
	</div>

	<div class="content-wrapper">
		{@render children?.()}
	</div>
</div>

<ModalSelectProject bind:this={projectModal} {projects} />
<SearchModal bind:this={searchModal} {projects} />

<!-- Single shared <dialog> backing modal.confirm/error/success/prompt. -->
<Modal />

<style>
	:root {
		--width-sidebar: 16rem;
		--height-navbar: 4rem;
		--content-sidegap: 2rem;
	}
	.app-layout {
		position: relative;
	}

	.navbar-wrapper,
	.sidebar-wrapper,
	.content-wrapper {
		transition: all var(--timing-normal) ease-in-out;
	}

	.sidebar-wrapper {
		position: fixed;
		z-index: 1;

		transform: translate3d(0, 0, 0);
	}

	.navbar-wrapper {
		position: fixed;
		z-index: 1;

		width: 100%;

		padding-left: var(--width-sidebar);

		/* Own view-transition snapshot: the app chrome stays put during page
		 * transitions instead of fading with the whole viewport. The sidebar's
		 * name lives on nav.sidebar (this wrapper's counterpart is a 0×0 box —
		 * the nav inside it is absolutely positioned — which would snapshot
		 * as nothing and make the sidebar flash out during transitions). */
		view-transition-name: navbar;
	}

	.content-wrapper {
		padding-top: calc(var(--height-navbar) + var(--content-sidegap));
		padding-left: calc(var(--width-sidebar) + var(--content-sidegap));
		padding-right: 2rem;
		padding-bottom: 2rem;

	}

	@media screen and (max-width: 1023px) {
		:root {
			--content-sidegap: 1rem;
		}

		.navbar-wrapper {
			padding-left: 0;
		}

		.sidebar-wrapper {
			transform: translate3d(calc(var(--width-sidebar) * -1), 0, 0);
		}

		.app-layout.is-shown-sidebar .sidebar-wrapper {
			transform: translate3d(0, 0, 0);
		}

		.content-wrapper {
			padding-left: var(--content-sidegap);
			padding-right: var(--content-sidegap);
		}

		.app-layout.is-shown-sidebar .sidebar-backdrop {
			position: fixed;
			top: 0;
			left: 0;
			width: 100vw;
			height: 100vh;
			/* dvh after vh so it wins where supported (iOS Safari toolbar). */
			height: 100dvh;
		}
	}
</style>
