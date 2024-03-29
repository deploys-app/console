<script>
	import { scale } from 'svelte/transition'
	import gravatarUrl from 'gravatar-url'
	import Cookie from 'js-cookie'

	/** @type {Api.Profile | null} */
	export let profile = null

	let active = false

	/** @type {HTMLFormElement} */
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

	function doSignOut () {
		signOut.submit()
	}

	function setTheme (value) {
		document.documentElement.dataset.theme = value
		Cookie.set('theme', value, { expires: 30 })
	}
</script>

<nav class="navbar">
	<div class="icon-nav-menu _dp-n:md" on:click={toggleSidebar} on:keypress={toggleSidebar} tabindex="0" role="button">
		<i class="fa-light fa-bars"></i>
	</div>

	<div class="_dp-f _mgl-at">
		<div class="nm-dropdown _mgl-at _mgt-at _mgbt-at">
			<div class="nm-button is-icon-left is-size-small is-variant-secondary" role="button" tabindex="0">
				<i class="fa-solid fa-palette"></i>
				Theme
			</div>
			<ul class="nm-menu is-card is-compact">
				<li><div on:click={() => setTheme('dark')} on:keypress={() => setTheme('dark')} role="button" tabindex="0">Dark</div></li>
				<li><div on:click={() => setTheme('light')} on:keypress={() => setTheme('light')} role="button" tabindex="0">Light</div></li>
			</ul>
		</div>

		<div>
			<div class="avatar" on:click|stopPropagation={toggle} on:keypress={toggle} tabindex="0" role="button">
				<img src={profile ? gravatarUrl(profile.email) : 'https://www.gravatar.com/avatar'} alt="profile" width="36" class="_bdrd-max" crossorigin="anonymous" draggable="false">
			</div>

			{#if active}
				<div class="popup" transition:scale={{ duration: 160 }}>
					<ul class="user-menu">
						<li>
							<a class="item _dp-b" href="/billing" on:click={close}>
								Billing accounts
							</a>
						</li>
						<li>
							<div class="item" on:click={doSignOut} on:keypress={doSignOut} tabindex="0" role="button">
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
		color: hsl(var(--hsl-black)/var(--cl-opacity));
	}

	ul.user-menu > li {
		padding: 0 1rem;
	}

	ul.user-menu > li > .item {
		padding: .75rem .5rem;
	}

	a.item {
		color: inherit;
	}

	ul.user-menu > li:not(:last-child) .item {
		border-bottom: 1px solid rgb(238, 238, 238);
	}

	ul.user-menu > li:hover {
		background-color: hsl(var(--hsl-primary)/0.05);
		cursor: pointer;
	}

	.navbar {
		display: flex;
		width: 100%;
		height: var(--height-navbar, 20rem);
		background-color: hsl(var(--hsl-base-300));
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
