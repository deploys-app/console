<script>
	import Swal from 'sweetalert2'
	import 'sweetalert2/dist/sweetalert2.min.css'

	async function open ({ title, yes, callback }) {
		const result = await Swal.fire({
			title: 'Are you sure ?',
			text: title,
			icon: 'warning',
			showCancelButton: true,
			buttonsStyling: false,
			confirmButtonText: yes || 'Yes',
			customClass: {
				confirmButton: 'moon-button _cl-white -danger _mgr-16px',
				cancelButton: 'moon-button -negative -tertiary',
				actions: '_mgt-24px',
			},
		})
		if (!result.value) {
			return
		}

		callback()
	}
</script>

<svelte:window on:confirm={(e) => open(e.detail)} />
