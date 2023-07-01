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

/**
 * intervalInvalidate calls callback every interval milliseconds
 * must be called in onMount
 * callback can return a number to override the interval for only the next call
 * @param {() => Promise<number | void>} callback
 * @param {number} interval
 * @returns {() => void}
 */
function intervalInvalidate (callback, interval) {
	let p

	const f = async () => {
		let newInterval = await callback()
		if (!newInterval) {
			newInterval = interval
		}
		p = setTimeout(f, newInterval)
	}
	p = setTimeout(f, interval)

	return () => {
		clearTimeout(p)
	}
}

export default {
	invoke,
	setOnUnauth,
	invalidate: wrapInvalidate,
	intervalInvalidate
}
