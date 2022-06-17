<script>
	import { onDestroy } from 'svelte'

	export let action
	export let status
	export let url

	const statusIconClass = {
		pending: 'fa-solid fa-spinner-third fa-spin',
		success: 'fa-solid fa-check-circle _cl-positive-500',
		error: 'fa-solid fa-times _cl-negative-500',
		cancelled: 'fa-solid fa-ban _cl-negative-500'
	}

	let podStatus
	let iconClass
	$: {
		status
		url
		action
		fetchPodStatus()
	}
	$: {
		podStatus
		iconClass = getIconClass()
	}

	function getIconClass () {
		if (status !== 'success') {
			return statusIconClass[status] || 'fa-solid fa-minus _cl-light'
		}

		if (action === 'pause') {
			return 'fa-solid fa-pause _cl-warning-500'
		}

		if (!podStatus) {
			return 'fa-solid fa-spin fa-spinner _cl-light'
		}
		if (podStatus.ready === podStatus.count) {
			return 'fa-solid fa-check-circle _cl-positive-500'
		}
		return 'fa-solid fa-exclamation-triangle _cl-warning-500'
	}

	let fetchPodStatusTimeout

	async function fetchPodStatus () {
		if (fetchPodStatusTimeout) {
			clearTimeout(fetchPodStatusTimeout)
			fetchPodStatusTimeout = null
		}

		try {
			const response = await fetch(url)
			podStatus = await response.json()
		} finally {
			if (!podStatus || podStatus.ready !== podStatus.count) {
				setTimeout(() => fetchPodStatus(), 5000)
			}
		}
	}

	onDestroy(() => {
		fetchPodStatusTimeout && clearTimeout(fetchPodStatusTimeout)
	})
</script>

<i class={`${iconClass} _mgh-12px`}></i>
