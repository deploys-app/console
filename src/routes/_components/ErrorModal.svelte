<script>
	import Swal from 'sweetalert2'
	import 'sweetalert2/dist/sweetalert2.min.css'

	async function open ({ error, callback }) {
		let msg = error?.message || error

		await Swal.fire({
			title: 'Oops...',
			text: msg,
			icon: 'error',
			customClass: {
				actions: '_mgt-24px'
			}
		})
		callback()
	}
</script>

<svelte:window on:error={(e) => open(e.detail)} />
