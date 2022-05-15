<script>
	export let status

	const iconClass = {
		'pending': 'fas fa-spinner-third fa-spin',
		'success': 'fas fa-check-circle _cl-positive-500',
		'error': 'fas fa-times _cl-negative-500',
		'cancelled': 'fas fa-ban _cl-negative-500',
	}

	function getIconClass () {
		return iconClass[status] || 'fas fa-minus _cl-light'
	}
</script>

<i class={`${getIconClass()} _mgh-12px`}></i>
