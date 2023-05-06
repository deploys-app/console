import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

/**
 * @typedef {Object} ModalConfirmOptions
 * @property {string} [title]
 * @property {string} [html]
 * @property {string} [yes]
 * @property {function?} [callback]
 */

/**
 * @param {ModalConfirmOptions} options
 * @returns {Promise<boolean>}
 */
export async function confirm ({ title, html, yes, callback }) {
	const result = await Swal.fire({
		title: 'Are you sure ?',
		text: title,
		html,
		icon: 'warning',
		showCancelButton: true,
		buttonsStyling: false,
		confirmButtonText: yes || 'Yes',
		customClass: {
			confirmButton: 'button _cl-white -danger _mgr-16px',
			cancelButton: 'button -negative -tertiary',
			actions: '_mgt-24px'
		}
	})
	if (!result.value) {
		return false
	}

	callback?.()
	return true
}

/**
 * @typedef {Object} ModalErrorOptions
 * @property {string | import('$types').Error} error
 * @property {Function} [callback]
 */

/**
 * @param {ModalErrorOptions} options
 * @returns {Promise<void>}
 */
export async function error ({ error, callback }) {
	if (!error) {
		callback?.()
		return
	}

	let msg = ''
	if (typeof error === 'string') {
		msg = error
	} else {
		if (error.message) {
			msg = error.message
		}
		if (error.validate) {
			msg = error.validate.join('<br>')
		}
	}

	await Swal.fire({
		title: 'Oops...',
		html: msg,
		icon: 'error',
		customClass: {
			actions: '_mgt-24px'
		}
	})
	callback?.()
}

export async function success ({ content }) {
	await Swal.fire(
		'Success',
		content,
		'success'
	)
}
