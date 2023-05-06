<script>
	import '$style/main.scss'
	import Navbar from '../_components/Navbar.svelte'
	import Sidebar from '../_components/Sidebar.svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import * as stores from '$lib/stores'
	import { browser } from '$app/environment'
	import api from '$lib/api'
	import ModalSelectProject from '../_components/ModalSelectProject.svelte'

	export let data

	$: profile = data.profile
	$: projects = data.projects

	stores.profile.set(profile)
	stores.projects.set(projects)

	let showSidebar = false
	$: $page, showSidebar = false

	/** @type {ModalSelectProject} */
	let projectModal

	if (browser) {
		api.setOnUnauth(() => {
			goto('/auth/signin')
		})
	}

	function hideSidebar () {
		showSidebar = false
	}
</script>

<svelte:window
	on:sidebar:toggle={() => showSidebar = !showSidebar} />

<div class="app-layout"
	class:is-shown-sidebar={showSidebar}>
	<div class="navbar-wrapper">
		<Navbar {profile} />
	</div>

	<div class="sidebar-wrapper">
		<div class="sidebar-backdrop" on:click={hideSidebar} on:keypress={hideSidebar}></div>
		<Sidebar {projects} on:openProjectModal={() => projectModal.open()} />
	</div>

	<div class="content-wrapper">
		<slot />
	</div>
</div>

<ModalSelectProject bind:this={projectModal} {projects} />

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
		}
	}
</style>
