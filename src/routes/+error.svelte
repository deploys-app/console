<script lang="ts">
	// This is the app's only error boundary. It renders for any error thrown from
	// a load function — most importantly the 401 raised by (auth)/+layout.ts when
	// the session has expired. Instead of bouncing straight to the OAuth provider,
	// we show a "session expired" page with an explicit "Sign in" button so the
	// user chooses when to re-authenticate (no surprise full-page redirect).
	//
	// The (auth) layout failed to load, so its chrome and global stylesheet aren't
	// mounted here — import the stylesheet directly so this page is themed.
	import '$style/app.css'
	import { page } from '$app/stores'

	const isUnauth = $derived($page.status === 401)

	// Preserve where the user was so sign-in lands them back here. The URL is
	// same-origin by construction; /auth/signin + /auth/callback re-validate it.
	const next = $derived($page.url.pathname + $page.url.search)
	const signinHref = $derived(
		next && next !== '/'
			? `/auth/signin?redirect=${encodeURIComponent(next)}`
			: '/auth/signin'
	)
</script>

<div class="error-page">
	<div class="panel is-level-300 error-card">
		<img class="logo" src="/images/logo.webp" alt="Deploys.app" draggable="false">

		{#if isUnauth}
			<div class="empty-state">
				<i class="fa-solid fa-lock empty-icon"></i>
				<!-- A missing token and an expired token both surface as a 401, so the
				     copy must read true for a returning user AND a first-time visitor. -->
				<p class="empty-title">Sign in to continue</p>
				<p class="empty-sub">Your session isn't active. Sign in to access the console.</p>
				<!-- A plain link to the server sign-in endpoint (not client-routed):
				     data-sveltekit-reload forces a real navigation so the GET handler
				     runs and starts the OAuth flow. -->
				<a class="button is-icon-left mt-2" href={signinHref} data-sveltekit-reload>
					<i class="fa-solid fa-right-to-bracket"></i>
					Sign in
				</a>
			</div>
		{:else}
			<div class="empty-state">
				<i class="fa-solid fa-triangle-exclamation empty-icon error-icon"></i>
				<p class="empty-title">Something went wrong</p>
				<p class="empty-sub">{$page.error?.message || 'An unexpected error occurred.'}</p>
				<p class="error-status">Error {$page.status}</p>
				<a class="button is-variant-secondary is-icon-left mt-2" href={next} data-sveltekit-reload>
					<i class="fa-solid fa-rotate-right"></i>
					Try again
				</a>
			</div>
		{/if}
	</div>
</div>

<style>
	.error-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		/* dvh after vh so it wins where supported (iOS Safari toolbar). */
		min-height: 100dvh;
		padding: 1.5rem;
	}

	.error-card {
		width: 100%;
		max-width: 26rem;
		text-align: center;
	}

	.logo {
		height: 2rem;
		margin: 0 auto;
		-webkit-user-select: none;
		user-select: none;
	}

	/* Override the empty-state icon's primary tint for the generic-error branch. */
	.error-icon {
		color: hsl(var(--hsl-negative) / 0.7);
	}

	.error-status {
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.45);
	}
</style>
