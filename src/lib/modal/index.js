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
			confirmButton: 'nm-button is-variant-negative _mgr-6',
			cancelButton: 'nm-button is-variant-tertiary',
			actions: '_mgt-7'
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
 * @property {string | import('$types').Error | unknown} [error]
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
	} else if (error instanceof Error) {
		msg = error.message
	} else if (typeof error === 'object') {
		if ('message' in error && typeof error.message === 'string') {
			msg = error.message
		}
		if ('validate' in error && Array.isArray(error.validate)) {
			msg = error.validate.join('<br>')
		}
	}

	await Swal.fire({
		title: 'Oops...',
		html: msg,
		icon: 'error',
		customClass: {
			actions: '_mgt-7'
		}
	})
	callback?.()
}

/**
 * @typedef {Object} ModalSuccessOptions
 * @property {string} [content]
 */

/**
 * @param {ModalSuccessOptions} options
 * @returns {Promise<void>}
 */
export async function success ({ content }) {
	await Swal.fire(
		'Success',
		content,
		'success'
	)
}
