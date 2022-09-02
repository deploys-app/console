<script>
	import { scale } from 'svelte/transition'
	import gravatarUrl from 'gravatar-url'

	export let profile

	let active
	let signOut

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
		window.dispatchEvent(new Event('sidebar:toggle'))
	}
</script>

<nav class="navbar">
	<div class="icon-nav-menu _dp-n-md" on:click={toggleSidebar}>
		<i class="fa-light fa-bars"></i>
	</div>

	<div class="_mgl-at">
		<div class="avatar" on:click|stopPropagation={toggle}>
			<img src={gravatarUrl(profile.email)} alt="profile" width="36" class="_bdrd-max" crossorigin>
		</div>

		{#if active}
			<div class="popup" transition:scale={{ duration: 160 }}>
				<ul class="user-menu">
					<li>
						<a class="item _dp-b" href="/billing" on:click={close}>
							Billing accounts
						</a>
					</li>
					<li on:click={() => signOut.submit()}>
						<div class="item">
							Signout
						</div>
						<form class="_dp-n" method="POST" action="/auth/signout" bind:this={signOut}>
							<button>Sign Out</button>
						</form>
					</li>
				</ul>
			</div>
		{/if}
	</div>
</nav>

<style>
	.popup {
		position: absolute;
		z-index: 1;
		box-shadow: var(--raised-z11);
		min-width: 256px;

		right: 1rem;
		margin-top: -.5rem;
		transform-origin: top right;
	}

	ul.user-menu {
		border-radius: 3px;
		overflow: hidden;

		background: white;
		color: var(--color-dark-primary);
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

	.navbar {
		display: flex;
		width: 100%;
		height: var(--height-navbar, 20rem);
		background-color: var(--color-neutral-600);
		box-shadow: var(--raised-z10);
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
