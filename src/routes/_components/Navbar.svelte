<script>
	import { createEventDispatcher } from 'svelte'
	import gravatarUrl from 'gravatar-url'
	import { goto } from '$app/navigation'
	import api from '$lib/api'
	import { profile } from '$lib/stores'

	let active

	const dispatch = createEventDispatcher()

	export function open () {
		active = true
	}

	export function close () {
		active = false
	}

	export function toggle () {
		active = !active
	}

	function toggleSidebar () {
		dispatch('toggle-sidebar')
	}

	function signOut () {
		api.signOut(goto)
	}
</script>

<nav class="moon-navbar">
	<div class="icon-nav-menu _dp-n-md" on:click={toggleSidebar}>
		<i class="fal fa-bars"></i>
	</div>

	<div class="_mgl-at">
		<div class="avatar" on:click|stopPropagation={toggle}>
			<img src={gravatarUrl($profile?.email)} alt="profile" width="36" class="_bdrd-max">
		</div>

		<div class="moon-popup" class:is-active={active}>
			<ul class="user-menu">
				<li>
					<a class="item _dp-b" href="/billing" on:click={close}>
                        Billing accounts
                    </a>
				</li>
				<li on:click={signOut}>
					<div class="item">
						Signout
					</div>
				</li>
			</ul>
		</div>
	</div>
</nav>

<style>
	.moon-popup {
		right: 1rem;
		margin-top: -.5rem;

		transition: all var(--timing-faster) ease-in-out;

		transform-origin: top right;
		transform: scale(0);
	}

	ul.user-menu {
		border-radius: 3px;
		overflow: hidden;

		background: white;
		color: var(--color-dark-primary);
	}

	.moon-popup.is-active {
		transform: scale(1);
	}

	ul.user-menu > li {
		padding: 0 1rem;
	}

	ul.user-menu > li > .item {
		padding: .75rem .5rem;
	}

	ul.user-menu > li:not(:last-child) .item {
		border-bottom: 1px solid rgb(238, 238, 238);
	}

	ul.user-menu > li:hover {
		background-color: var(--color-primary-100);
		cursor: pointer;
	}

	.moon-navbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.icon-nav-menu {
		display: flex;
		align-items: center;
		justify-content: center;
		height: calc(var(--height-navbar) - 1rem);
		width: calc(var(--height-navbar) - 1rem);
		margin-left: .5rem;

		font-size: 1.5rem;
		border-radius: 50%;

		cursor: pointer;

	}

	.icon-nav-menu:hover {
		background: rgba(190, 197, 255, 0.075);
	}

	.avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--height-navbar);
		height: var(--height-navbar);
		cursor: pointer;
	}

	.avatar:hover {
		background: rgba(190, 197, 255, 0.075);
	}
</style>
