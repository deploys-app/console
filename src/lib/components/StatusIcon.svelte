<script>

	/**
	 * @typedef {Object} Props
	 * @property {string} status
	 */

	/** @type {Props} */
	let { status } = $props()

	const iconClassByStatus = {
		pending: 'fa-solid fa-spinner-third fa-spin',
		success: 'fa-solid fa-check-circle _cl-positive _cl-opacity-80',
		error: 'fa-solid fa-times _cl-negative _cl-opacity-80',
		cancelled: 'fa-solid fa-ban _cl-negative _cl-opacity-80',
		verify: 'fa-solid fa-exclamation-triangle _cl-warning'
	}

	let iconClass = $derived(iconClassByStatus[status] || 'fa-solid fa-minus _cl-light')
</script>

<i class={`${iconClass} _mgh-5`}></i>
