<script>
	import { onDestroy } from 'svelte'

	export let action
	export let status
	export let url

	const statusIconClass = {
		pending: 'fas fa-spinner-third fa-spin',
		success: 'fas fa-check-circle _cl-positive-500',
		error: 'fas fa-times _cl-negative-500',
		cancelled: 'fas fa-ban _cl-negative-500'
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
			return statusIconClass[status] || 'fas fa-minus _cl-light'
		}

		if (action === 'pause') {
			return 'fas fa-pause _cl-warning-500'
		}

		if (!podStatus) {
			return 'fas fa-spin fa-spinner _cl-light'
		}
		if (podStatus.ready === podStatus.count) {
			return 'fas fa-check-circle _cl-positive-500'
		}
		return 'fas fa-exclamation-triangle _cl-warning-500'
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
