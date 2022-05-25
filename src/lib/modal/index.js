import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

export default {
	async confirm ({ title, yes, callback }) {
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
				actions: '_mgt-24px'
			}
		})
		if (!result.value) {
			return
		}

		callback()
	},
	async error ({ error, callback }) {
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
}
