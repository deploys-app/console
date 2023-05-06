import { invalidate } from '$app/navigation'

const endpoint = '/api'

/** @type {Function} */
let onUnauth

/**
 * @template T
 * @param {string} fn
 * @param {Object} args
 * @param {fetch} fetch
 * @returns {Promise<import('$types').ApiResponse<T>>}
 */
async function invoke (fn, args, fetch) {
	const resp = await fetch(`${endpoint}/${fn}`, {
		method: 'POST',
		body: JSON.stringify(args || {}),
		headers: {
			'content-type': 'application/json'
		}
	})

	const body = await resp.json()
	if (!body.ok) {
		const msg = body.error?.message || ''
		switch (msg) {
		case 'api: unauthorized':
			body.error.unauth = true
			onUnauth?.()
			break
		case 'iam: forbidden':
			body.error.forbidden = true
			break
		case 'api: validate error':
			body.error.validate = body.error.items
			break
		default:
			if (msg.includes('api: ') && msg.includes('not found')) {
				body.error.notFound = true
			}
			break
		}
	}
	return body
}

/**
 * @param {Function} callback
 */
function setOnUnauth (callback) {
	onUnauth = callback
}

/**
 * @param {string} fn
 * @returns {Promise<void>}
 */
function wrapInvalidate (fn) {
	return invalidate(`${endpoint}/${fn}`)
}

export default {
	invoke,
	setOnUnauth,
	invalidate: wrapInvalidate
}
