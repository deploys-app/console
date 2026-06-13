<script>
	import { onMount } from 'svelte'
	import { browser } from '$app/environment'
	import { scale } from 'svelte/transition'
	import gravatarUrl from 'gravatar-url'
	import Cookie from 'js-cookie'

	/**
	 * @typedef {Object} Props
	 * @property {Api.Profile | null} [profile]
	 * @property {() => void} toggleSidebar
	 * @property {() => void} [openSearch]
	 */

	/** @type {Props} */
	const { profile = null, toggleSidebar, openSearch } = $props()

	let active = $state(false)

	/** @type {'system' | 'light' | 'dark'} */
	let theme = $state(browser ? (/** @type {any} */ (Cookie.get('theme')) ?? 'system') : 'system')
	const themeIndex = $derived(theme === 'light' ? 1 : theme === 'dark' ? 2 : 0)

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

	/** @param {'system' | 'light' | 'dark'} value */
	function setTheme (value) {
		theme = value
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

	{#if openSearch}
		<button type="button" class="search-trigger" onclick={openSearch} aria-label="Search">
			<i class="fa-solid fa-magnifying-glass"></i>
			<span class="search-text">Search…</span>
			<kbd>/</kbd>
		</button>
	{/if}

	<div class="flex items-center gap-2 ml-auto">
		<div class="theme-toggle" role="group" aria-label="Theme">
			<span class="theme-knob" style="transform: translateX({themeIndex * 2}rem)"></span>
			<button type="button" class="theme-seg" class:on={theme === 'system'}
				aria-pressed={theme === 'system'} aria-label="System theme" title="System"
				onclick={() => setTheme('system')}>
				<i class="fa-solid fa-desktop"></i>
			</button>
			<button type="button" class="theme-seg" class:on={theme === 'light'}
				aria-pressed={theme === 'light'} aria-label="Light theme" title="Light"
				onclick={() => setTheme('light')}>
				<i class="fa-solid fa-sun-bright"></i>
			</button>
			<button type="button" class="theme-seg" class:on={theme === 'dark'}
				aria-pressed={theme === 'dark'} aria-label="Dark theme" title="Dark"
				onclick={() => setTheme('dark')}>
				<i class="fa-solid fa-moon"></i>
			</button>
		</div>

		<div>
			<div class="avatar" onclick={toggle} onkeypress={toggle} tabindex="0" role="button">
				<img src={profile ? gravatarUrl(profile.email, { default: 'mp' }) : 'https://www.gravatar.com/avatar?d=mp'} alt="profile" width="36" class="rounded-full" crossorigin="anonymous" draggable="false">
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
	.search-trigger {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		height: 2.25rem;
		margin-left: 0.75rem;
		padding: 0 0.5rem 0 0.75rem;
		min-width: 16rem;
		background-color: hsl(var(--hsl-base-200));
		border: 1px solid hsl(var(--hsl-line));
		border-radius: var(--radius-md);
		color: hsl(var(--hsl-content) / 0.5);
		font-size: var(--fs-2);
		cursor: pointer;
		transition: border-color var(--timing-faster) ease, background-color var(--timing-faster) ease;
	}

	.search-trigger:hover {
		border-color: hsl(var(--hsl-primary) / 0.5);
		background-color: hsl(var(--hsl-primary) / 0.06);
	}

	.search-trigger:focus-visible {
		outline: 2px solid hsl(var(--hsl-primary));
		outline-offset: 2px;
	}

	.search-text {
		margin-right: auto;
	}

	.search-trigger kbd {
		display: inline-block;
		min-width: 1.25rem;
		padding: 0.0625rem 0.375rem;
		text-align: center;
		font-family: inherit;
		font-size: 0.75rem;
		line-height: 1.4;
		color: hsl(var(--hsl-content) / 0.7);
		background-color: hsl(var(--hsl-base-300));
		border: 1px solid hsl(var(--hsl-line));
		border-radius: var(--radius-sm);
	}

	/* On narrow screens collapse to a square icon-only button. */
	@media (max-width: 640px) {
		.search-trigger {
			min-width: 0;
			width: 2.25rem;
			padding: 0;
			justify-content: center;
		}

		.search-text,
		.search-trigger kbd {
			display: none;
		}
	}

	.theme-toggle {
		position: relative;
		display: inline-flex;
		padding: 3px;
		background-color: hsl(var(--hsl-base-200));
		border: 1px solid hsl(var(--hsl-line));
		border-radius: 9999px;
	}

	.theme-knob {
		position: absolute;
		top: 3px;
		left: 3px;
		width: 2rem;
		height: 2rem;
		border-radius: 9999px;
		background-color: hsl(var(--hsl-primary));
		transition: transform var(--timing-faster) ease;
		pointer-events: none;
	}

	.theme-seg {
		position: relative;
		z-index: 1;
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border: 0;
		border-radius: 9999px;
		background: transparent;
		color: hsl(var(--hsl-content) / 0.6);
		font-size: 0.8125rem;
		cursor: pointer;
		transition: color var(--timing-faster) ease;
	}

	.theme-seg:hover {
		color: hsl(var(--hsl-content));
	}

	.theme-seg.on,
	.theme-seg.on:hover {
		color: hsl(var(--hsl-primary-content));
	}

	.theme-seg:focus-visible {
		outline: 2px solid hsl(var(--hsl-primary));
		outline-offset: 2px;
	}

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
