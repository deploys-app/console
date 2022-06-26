<script>
	export let status

	const iconClass = {
		pending: 'fa-solid fa-spinner-third fa-spin',
		success: 'fa-solid fa-check-circle _cl-positive-500',
		error: 'fa-solid fa-times _cl-negative-500',
		cancelled: 'fa-solid fa-ban _cl-negative-500',
		verify: 'fa-solid fa-exclamation-triangle _cl-warning-500'
	}

	function getIconClass () {
		return iconClass[status] || 'fa-solid fa-minus _cl-light'
	}
</script>

<i class={`${getIconClass()} _mgh-12px`}></i>
