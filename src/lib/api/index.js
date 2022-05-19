import JSONBig from 'json-bigint'

const jsonBig = JSONBig({ storeAsString: true })

const endpoint = '/api'

async function _invoke (fn, args, fetch) {
	const response = await fetch(`${endpoint}/${fn}`, {
		method: 'POST',
		body: JSONBig.stringify(args),
		headers: {
			'content-type': 'application/json'
		}
	})
	return jsonBig.parse(await response.text())
}

let onUnauth

async function invoke (fn, args, fetch) {
	const body = await _invoke(fn, args || {}, fetch)
	if (!body.ok) {
		const msg = body.error?.message || ''
		switch (msg) {
			case 'api: unauthorized':
				body.error.unauth = true
				onUnauth && onUnauth()
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

export default {
	invoke,
	setOnUnauth: (callback) => {
		onUnauth = callback
	}
}
