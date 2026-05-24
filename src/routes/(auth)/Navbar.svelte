<script>
	import { onMount } from 'svelte'
	import { scale } from 'svelte/transition'
	import gravatarUrl from 'gravatar-url'
	import Cookie from 'js-cookie'

	/**
	 * @typedef {Object} Props
	 * @property {Api.Profile | null} [profile]
	 * @property {() => void} toggleSidebar
	 */

	/** @type {Props} */
	const { profile = null, toggleSidebar } = $props()

	let active = $state(false)

	/** @type {?HTMLFormElement} */
	let signOut = $state(null)

	export function open () {
		active = true
	}

	export function close () {
		active = false
	}

	/**
	 * @param {Event} e
	 */
	export function toggle (e) {
		e.stopPropagation()

		active = !active
	}

	function doSignOut () {
		signOut?.submit()
	}

	function applySystemTheme () {
		document.documentElement.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches)
	}

	function setTheme (value) {
		if (value === 'system') {
			Cookie.remove('theme')
			applySystemTheme()
			return
		}
		document.documentElement.classList.toggle('dark', value === 'dark')
		Cookie.set('theme', value, { expires: 30 })
	}

	onMount(() => {
		const mq = window.matchMedia('(prefers-color-scheme: dark)')
		// Follow OS changes live only while no explicit choice is stored.
		const onChange = (e) => {
			if (!Cookie.get('theme')) {
				document.documentElement.classList.toggle('dark', e.matches)
			}
		}
		mq.addEventListener('change', onChange)
		return () => mq.removeEventListener('change', onChange)
	})
</script>

<nav class="navbar">
	<div class="icon-nav-menu" onclick={toggleSidebar} onkeypress={toggleSidebar} tabindex="0" role="button">
		<i class="fa-light fa-bars"></i>
	</div>

	<div class="flex ml-auto">
		<div class="dropdown ml-auto mt-auto mb-auto">
			<div class="button is-icon-left is-size-small is-variant-secondary" role="button" tabindex="0">
				<i class="fa-solid fa-palette"></i>
				Theme
			</div>
			<ul class="menu is-card is-compact">
				<li><div onclick={() => setTheme('system')} onkeypress={() => setTheme('system')} role="button" tabindex="0">System</div></li>
				<li><div onclick={() => setTheme('dark')} onkeypress={() => setTheme('dark')} role="button" tabindex="0">Dark</div></li>
				<li><div onclick={() => setTheme('light')} onkeypress={() => setTheme('light')} role="button" tabindex="0">Light</div></li>
			</ul>
		</div>

		<div>
			<div class="avatar" onclick={toggle} onkeypress={toggle} tabindex="0" role="button">
				<img src={profile ? gravatarUrl(profile.email) : 'https://www.gravatar.com/avatar'} alt="profile" width="36" class="rounded-full" crossorigin="anonymous" draggable="false">
			</div>

			{#if active}
				<div class="popup" transition:scale={{ duration: 160 }}>
					<ul class="user-menu">
						<li>
							<a class="item block" href="/billing" onclick={close}>
								Billing accounts
							</a>
						</li>
						<li>
							<div class="item" onclick={doSignOut} onkeypress={doSignOut} tabindex="0" role="button">
								Sign Out
							</div>
							<form class="hidden" method="POST" action="/auth/signout" bind:this={signOut}>
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
		border-radius: var(--radius-md);
		overflow: hidden;

		background: hsl(var(--hsl-base-300));
		color: hsl(var(--hsl-content));
		border: 1px solid hsl(var(--hsl-line));
		box-shadow: var(--raised-z8);
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
		border-bottom: 1px solid hsl(var(--hsl-line));
	}

	ul.user-menu > li:hover {
		background-color: hsl(var(--hsl-primary)/0.08);
		cursor: pointer;
	}

	.navbar {
		display: flex;
		width: 100%;
		height: var(--height-navbar, 20rem);
		background-color: hsl(var(--hsl-base-300) / 0.8);
		backdrop-filter: blur(12px) saturate(140%);
		-webkit-backdrop-filter: blur(12px) saturate(140%);
		border-bottom: 1px solid hsl(var(--hsl-line));
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
		background: hsl(var(--hsl-content) / 0.05);
	}

	/* Hide on desktop (>= lg). The scoped selector includes Svelte's
	 * hash class, so it outweighs Tailwind's `.lg\:hidden` utility
	 * — that's why this lives here instead of on the element. */
	@media (min-width: 1024px) {
		.icon-nav-menu {
			display: none;
		}
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
		background: hsl(var(--hsl-content) / 0.05);
	}
</style>
