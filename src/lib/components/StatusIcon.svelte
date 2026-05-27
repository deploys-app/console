<script>

	/**
	 * @typedef {Object} Props
	 * @property {string} status
	 */

	/** @type {Props} */
	const { status } = $props()

	const iconClassByStatus = {
		pending: 'fa-solid fa-spinner-third fa-spin',
		success: 'fa-solid fa-check-circle text-positive/80',
		error: 'fa-solid fa-times text-negative/80',
		cancelled: 'fa-solid fa-ban text-negative/80',
		verify: 'fa-solid fa-exclamation-triangle text-warning'
	}

	const iconClass = $derived(iconClassByStatus[status] || 'fa-solid fa-minus text-content/40')
</script>

<i class={`${iconClass} mr-3`}></i>
