<script>
	import Swal from 'sweetalert2'
	import 'sweetalert2/dist/sweetalert2.min.css'

	async function open ({ error, callback }) {
		let msg = error?.message || error

		if (error.validate) {
			msg = error.validate.join('<br>')
		}

		await Swal.fire({
			title: 'Oops...',
			html: msg,
			icon: 'error',
			customClass: {
				actions: '_mgt-24px'
			}
		})
		callback && callback()
	}
</script>

<svelte:window on:error={(e) => open(e.detail)} />
