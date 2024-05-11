<script>
	import { browser } from '$app/environment'
	import { onDestroy } from 'svelte'

	/** @type {Api.DeploymentAction} */
	export let action

	/** @type {Api.DeploymentStatus} */
	export let status

	/** @type {string} */
	export let url

	/** @type {Api.DeploymentType} */
	export let type

	const statusIconClass = {
		pending: 'fa-solid fa-spinner-third fa-spin',
		success: 'fa-solid fa-check-circle _cl-positive _cl-opacity-80',
		error: 'fa-solid fa-times _cl-negative _cl-opacity-80',
		cancelled: 'fa-solid fa-ban _cl-negative _cl-opacity-80'
	}

	/** @type {Api.PodStatus | null} */
	let podStatus

	/** @type {string} */
	let iconClass

	$: {
		status
		url
		action
		browser && fetchPodStatus()
	}
	$: {
		podStatus
		iconClass = getIconClass()
	}

	/**
	 * @returns {string}
	 */
	function getIconClass () {
		if (status !== 'success') {
			return statusIconClass[status] || 'fa-solid fa-minus _cl-light'
		}

		if (action === 'pause') {
			return 'fa-solid fa-pause _cl-warning'
		}

		if (!podStatus) {
			return 'fa-solid fa-spin fa-spinner _cl-light'
		}
		if (type === 'CronJob' && podStatus.count === podStatus.succeeded + podStatus.ready) {
			return 'fa-solid fa-check-circle _cl-positive _cl-opacity-80'
		}
		if (podStatus.count > 0 && podStatus.ready === podStatus.count) {
			return 'fa-solid fa-check-circle _cl-positive _cl-opacity-80'
		}
		return 'fa-solid fa-exclamation-triangle _cl-warning'
	}

	let fetchPodStatusTimeout
	let destroyed = false

	async function fetchPodStatus () {
		if (destroyed) {
			return
		}

		if (fetchPodStatusTimeout) {
			clearTimeout(fetchPodStatusTimeout)
			fetchPodStatusTimeout = null
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
			fetchPodStatusTimeout = setTimeout(fetchPodStatus, 10000)
		}
	}

	onDestroy(() => {
		destroyed = true
		fetchPodStatusTimeout && clearTimeout(fetchPodStatusTimeout)
	})
</script>

<i class={`${iconClass} _mgh-5`}></i>
