<script>
	import { browser } from '$app/environment'
	import { onDestroy } from 'svelte'

	/**
	 * @typedef {Object} Props
	 * @property {Api.DeploymentAction} action
	 * @property {Api.DeploymentStatus} status
	 * @property {string} url
	 * @property {Api.DeploymentType} type
	 */

	/** @type {Props} */
	const {
		action,
		status,
		url,
		type
	} = $props()

	const statusIconClass = {
		pending: 'fa-solid fa-spinner-third fa-spin',
		success: 'fa-solid fa-check-circle text-positive/80',
		error: 'fa-solid fa-times text-negative/80',
		cancelled: 'fa-solid fa-ban text-negative/80'
	}

	/** @type {Api.PodStatus | null} */
	let podStatus = $state(null)

	/** @type {?HTMLElement} */
	let el = $state(null)
	let visible = $state(false)
	let hasBeenVisible = $state(false)

	// Pod readiness only changes the icon for a running (non-paused) success
	// deployment; every other state is resolved from props alone, so there's no
	// reason to hit statusUrl for it. Static deployments have no pods (served by
	// the static-gateway, no statusUrl), so they never poll either.
	const needsPodStatus = $derived(status === 'success' && action !== 'pause' && type !== 'Static')

	/**
	 * @returns {string}
	 */
	function getIconClass () {
		if (status !== 'success') {
			return statusIconClass[status] || 'fa-solid fa-minus text-content/40'
		}

		if (action === 'pause') {
			return 'fa-solid fa-pause text-warning'
		}

		if (type === 'Static') {
			// No pods to wait on — a successful release is simply done.
			return 'fa-solid fa-check-circle text-positive/80'
		}

		if (!podStatus) {
			// Readiness not loaded yet. Only spin while the row is on-screen;
			// off-screen rows show a static placeholder so a long list doesn't
			// animate hundreds of spinners at once.
			return (visible || hasBeenVisible)
				? 'fa-solid fa-spin fa-spinner text-content/40'
				: 'fa-solid fa-spinner text-content/30'
		}
		if (type === 'CronJob' && podStatus.count === podStatus.succeeded + podStatus.ready) {
			return 'fa-solid fa-check-circle text-positive/80'
		}
		if (podStatus.count > 0 && podStatus.ready === podStatus.count) {
			return 'fa-solid fa-check-circle text-positive/80'
		}
		return 'fa-solid fa-exclamation-triangle text-warning'
	}

	const iconClass = $derived(getIconClass())

	let timer
	let destroyed = false

	function clearTimer () {
		if (timer) {
			clearTimeout(timer)
			timer = null
		}
	}

	async function poll () {
		clearTimer()
		if (destroyed) {
			return
		}

		try {
			const response = await fetch(url)
			if (response.status === 403) {
				// token expired, stop polling
				return
			}
			podStatus = await response.json()
		} catch (err) {
			console.error(err)
		} finally {
			// The row may have scrolled out of view while the request was in
			// flight — only keep polling rows that still need it, and jitter the
			// interval so many rows don't re-fetch in lockstep.
			if (!destroyed && visible && needsPodStatus) {
				timer = setTimeout(poll, 10000 + Math.random() * 3000)
			}
		}
	}

	// Drop stale readiness if the deployment we're pointing at changes.
	$effect(() => {
		url
		podStatus = null
	})

	// Track viewport visibility so only on-screen rows fetch their status. The
	// margin starts polling slightly before a row scrolls into view.
	$effect(() => {
		if (!browser || !el) {
			return
		}
		const io = new IntersectionObserver((entries) => {
			visible = entries[entries.length - 1].isIntersecting
			if (visible) {
				hasBeenVisible = true
			}
		}, { rootMargin: '300px' })
		io.observe(el)
		return () => io.disconnect()
	})

	// Poll only while the row is visible and its icon depends on pod status.
	// Toggling visibility (or changing the target) restarts/stops the loop.
	$effect(() => {
		const active = browser && visible && needsPodStatus
		url
		clearTimer()
		if (active) {
			poll()
		}
		return clearTimer
	})

	onDestroy(() => {
		destroyed = true
		clearTimer()
	})
</script>

<i bind:this={el} class={`${iconClass} fa-fw mr-3`}></i>
