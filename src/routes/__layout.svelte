<script>
	import '../style/main.scss'
	import Navbar from './_components/Navbar.svelte'
	import Sidebar from './_components/Sidebar.svelte'
	import ConfirmModal from './_components/ConfirmModal.svelte'
	import ErrorModal from './_components/ErrorModal.svelte'
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import api from '$lib/api'
	import { profile, projects } from '$lib/stores'

	let init
	let showSidebar

	$: {
		$page
		if (showSidebar) {
			showSidebar = false
		}
	}

	onMount(async () => {
		const state = $page.url.searchParams.get('state')
		const code = $page.url.searchParams.get('code')

		if (state === localStorage.getItem('__auth_state') && code) {
			api.setToken(localStorage, code)
		}
		localStorage.removeItem('__auth_state')

		if (state || code) {
			const q = new URLSearchParams($page.url.search)
			q.delete('state')
			q.delete('code')
			await goto(`?${q.toString()}`)
		}

		api.loadToken(localStorage)

		try {
			profile.set(await api.me.get())
			projects.set(await api.project.list() || [])
			api.setOnUnauth(() => {
				signIn()
			})
			init = true
		} catch (e) {
			signIn()
		}
	})

	function signIn () {
		const state = api.randomState(crypto)
		localStorage.setItem('__auth_state', state)
		goto(`https://api.deploys.app/auth?callback=${$page.url}&state=${state}`)
	}
</script>

<svelte:window
	on:sidebar:toggle={() => showSidebar = !showSidebar} />

<div>
	{#if init}
		<div class="app-layout"
			class:is-shown-sidebar={showSidebar}>
			<div class="navbar-wrapper">
				<Navbar />
			</div>

			<div class="sidebar-wrapper">
				<div class="sidebar-backdrop" on:click={() => showSidebar = false}></div>
				<Sidebar />
			</div>

			<div class="content-wrapper">
				<slot />
			</div>
		</div>
	{/if}
</div>

<ConfirmModal />
<ErrorModal />

<style>
	:root {
		--width-sidebar: 16rem;
		--height-navbar: 4rem;
		--content-sidegap: 2rem;
	}
	.app-layout {
		position: relative;
	}

	.app-layout .navbar-wrapper,
	.app-layout .sidebar-wrapper,
	.app-layout .content-wrapper {
		transition: all var(--timing-normal) ease-in-out;
	}

	.app-layout .sidebar-wrapper {
		position: fixed;
		z-index: 1;

		transform: translate3d(0, 0, 0);
	}

	.app-layout .navbar-wrapper {
		position: fixed;
		z-index: 1;

		width: 100%;

		padding-left: var(--width-sidebar);
	}

	.app-layout .content-wrapper {
		padding-top: calc(var(--height-navbar) + var(--content-sidegap));
		padding-left: calc(var(--width-sidebar) + var(--content-sidegap));
		padding-right: 2rem;
		padding-bottom: 2rem;

	}

	@media screen and (max-width: 1023px) {
		:root {
			--content-sidegap: 1rem;
		}

		.app-layout .navbar-wrapper {
			padding-left: 0;
		}

		.app-layout .sidebar-wrapper {
			transform: translate3d(calc(var(--width-sidebar) * -1), 0, 0);
		}

		.app-layout.is-shown-sidebar .sidebar-wrapper {
			transform: translate3d(0, 0, 0);
		}

		.app-layout .content-wrapper {
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
